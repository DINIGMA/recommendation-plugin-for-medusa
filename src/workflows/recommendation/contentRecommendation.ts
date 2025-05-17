import {
  createStep,
  StepResponse,
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";

import { Modules } from "@medusajs/framework/utils";
import { ProductDTO } from "@medusajs/types";

const natural = require("natural");

const { removeStopwords, eng, fra } = require("stopword");

const tokenizer = new natural.WordTokenizer();

const preprocessText = (text: string): string[] => {
  const tokens = tokenizer.tokenize(text.toLowerCase());
  return removeStopwords(tokens);
};

type SparseVector = Map<number, number>;

export const computedTfidf = (texts: string[]) => {
  const docs = texts.map(preprocessText);

  const termFreqs: Map<number, Map<string, number>> = new Map();
  const docFreqs: Map<string, number> = new Map();
  const termIndexMap: Map<string, number> = new Map();
  let termCounter = 0;

  docs.forEach((tokens, docIdx) => {
    const freqMap = new Map<string, number>();
    const seen = new Set<string>();

    tokens.forEach((token) => {
      freqMap.set(token, (freqMap.get(token) || 0) + 1);
      if (!seen.has(token)) {
        docFreqs.set(token, (docFreqs.get(token) || 0) + 1);
        seen.add(token);
      }
      if (!termIndexMap.has(token)) {
        termIndexMap.set(token, termCounter++);
      }
    });

    termFreqs.set(docIdx, freqMap);
  });

  const numDocs = docs.length;

  const matrix: SparseVector[] = [];

  termFreqs.forEach((freqMap) => {
    const sparseRow: SparseVector = new Map();

    freqMap.forEach((tf, term) => {
      const df = docFreqs.get(term) || 1;
      const idf = Math.log(numDocs / df);
      const i = termIndexMap.get(term)!;
      sparseRow.set(i, tf * idf);
    });

    matrix.push(sparseRow);
  });

  return {
    matrix,
    termIndexMap,
  };
};

export const cosineSimilaritySparse = (
  vecA: Map<number, number>,
  vecB: Map<number, number>
): number => {
  let dot = 0;
  let normA = 0;
  let normB = 0;

  vecA.forEach((valA, idx) => {
    const valB = vecB.get(idx) || 0;
    dot += valA * valB;
    normA += valA * valA;
  });

  vecB.forEach((valB) => {
    normB += valB * valB;
  });

  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

type Recommendation = {
  id: string;
  product: ProductDTO;
  sim: number;
  categories: any;
  matchLevel?: number;
};

type WorkflowInput = {
  productIds: string[];
};

// const ONE_HOUR = 60 * 60 * 1000;

export const getContentRecommendation = createStep(
  "get-product-list",
  async ({ productIds }: WorkflowInput, { container }) => {
    const productModuleService = container.resolve("product");
    const cacheModuleService: any = container.resolve(Modules.CACHE);

    let tfidfVectors: { matrix: Map<number, number>[] } =
      await cacheModuleService.get("tfidfVector");

    let products: ProductDTO[];

    if (!tfidfVectors) {
      const [fetchedProducts] = await productModuleService.listAndCountProducts(
        {},
        { relations: ["categories"] }
      );

      // console.time("computedTfidf");
      const texts = fetchedProducts.map((product) => {
        const title = product.title.toLowerCase();
        const description = product.description?.toLowerCase();
        const categoriesText =
          product.categories?.map((item: any) => item.name)?.join(" ") || "";

        const weightedTitle = title
          .split(" ")
          .map((word) => `${word}^2`)
          .join(" ");
        const weightedDescription = description?.split(" ").join(" ");
        const weightedCategories = categoriesText
          .split(" ")
          .map((word) => `${word}^0.5`)
          .join(" ");

        return `${weightedTitle}, ${weightedDescription}, ${weightedCategories}`;
      });
      tfidfVectors = computedTfidf(texts);
      console.log(texts.length);
      console.log(fetchedProducts.length);
      // console.timeEnd("computedTfidf");
      // Преобразуем Map в объект, чтобы сохранить в кэш Redis не поддерживает Map
      const serializableMatrix = tfidfVectors.matrix.map((map) =>
        Object.fromEntries(map)
      );

      await cacheModuleService.set(
        "tfidfVector",
        { matrix: serializableMatrix },
        86400
      );

      products = fetchedProducts;

      await cacheModuleService.set(
        "cachedProducts",
        JSON.stringify(fetchedProducts),
        86400
      );
    } else {
      let cacheProducts = await cacheModuleService.get("cachedProducts");

      products = JSON.parse(cacheProducts);

      if (!products || products.length === 0) {
        console.log("Кэш пуст, выполняем запрос к БД");
        const fetchedProducts = await productModuleService.listProducts(
          {},
          {
            relations: ["categories"],
          }
        );

        products = fetchedProducts;
        await cacheModuleService.set(
          "cachedProducts",
          JSON.stringify(fetchedProducts),
          86400
        );
      }

      tfidfVectors.matrix = tfidfVectors.matrix.map(
        (obj) => new Map(Object.entries(obj).map(([k, v]) => [parseInt(k), v]))
      );
    }
    const allTopRecommendations: Recommendation[][] = [];

    for (const targetProductId of productIds) {
      const targetProduct = products.find((p) => p.id === targetProductId);
      if (!targetProduct) continue;

      const targetIndex = products.indexOf(targetProduct);
      const targetVector = tfidfVectors.matrix[targetIndex];

      // 1. Собираем иерархию категорий целевого товара
      const targetHierarchy: string[] = [];
      targetProduct.categories?.forEach((category) => {
        const mpath = (category as any).mpath?.split(".") || [];
        targetHierarchy.push(...mpath);
      });
      const targetMaxDepth = targetHierarchy.length - 1;

      const targetRecommendations: Recommendation[] = [];

      products.forEach((product, index) => {
        if (productIds.includes(product.id) || index === targetIndex) return;

        // 2. Вычисляем схожесть
        const sim = cosineSimilaritySparse(
          targetVector,
          tfidfVectors.matrix[index]
        );
        if (sim >= 1 || sim < 0.3) return;

        // 3. Собираем иерархию категорий претендента
        const pretenderHierarchy: string[] = [];
        product.categories?.forEach((c) => {
          const mpath = (c as any).mpath?.split(".") || [];
          pretenderHierarchy.push(...mpath);
        });

        // 4. Проверяем, является ли путь претендента подпутем целевого
        let isSubpath = true;
        let matchDepth = -1;
        for (let depth = 0; depth < pretenderHierarchy.length; depth++) {
          if (
            depth >= targetHierarchy.length ||
            pretenderHierarchy[depth] !== targetHierarchy[depth]
          ) {
            isSubpath = false;
            break;
          }
          matchDepth = depth;
        }

        if (!isSubpath) return; // Пропускаем претендента

        // 5. Рассчитываем уровень совпадения
        const matchLevel = targetMaxDepth - matchDepth;

        targetRecommendations.push({
          id: product.id,
          sim,
          product,
          categories: pretenderHierarchy,
          matchLevel,
        });
      });

      // 6. Сортировка: сначала по уровню совпадения, затем по схожести
      targetRecommendations.sort((a, b) => {
        if (a.matchLevel !== b.matchLevel) return a.matchLevel! - b.matchLevel!;
        return b.sim - a.sim;
      });

      allTopRecommendations.push(targetRecommendations.slice(0, 200));
    }

    // 7. Объединяем все рекомендации и удаляем дубликаты
    const mergedRecommendations = allTopRecommendations.flat();
    const uniqueRecommendations = new Map<string, Recommendation>();

    mergedRecommendations.forEach((rec) => {
      if (
        !uniqueRecommendations.has(rec.id) ||
        rec.sim > uniqueRecommendations.get(rec.id)!.sim
      ) {
        uniqueRecommendations.set(rec.id, rec);
      }
    });

    // 8. Финализируем список и сортируем по схожести
    const finalRecommendations = Array.from(uniqueRecommendations.values())
      .sort((a, b) => {
        // Сначала сортируем по matchLevel (чем меньше, тем выше)
        if (a.matchLevel !== b.matchLevel) {
          return a.matchLevel! - b.matchLevel!;
        }
        // Затем по схожести (убывание)
        return b.sim - a.sim;
      })
      .slice(0, 200);

    return new StepResponse({ rec: finalRecommendations });
  }
);

export const contentFiltering = createWorkflow(
  "recommendation",
  function (input: WorkflowInput) {
    // to pass input
    const str1 = getContentRecommendation(input);
    return new WorkflowResponse({
      recommendation: str1,
    });
  }
);
