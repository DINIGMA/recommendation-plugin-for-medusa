import { Migration } from '@mikro-orm/migrations';

export class Migration20250423104107 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "review" drop column if exists "last_name";`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "review" add column if not exists "last_name" text not null;`);
  }

}
