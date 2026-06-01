# ProtoLive DB Resources

이 디렉터리는 PostgreSQL 전환용 스키마와 샘플 데이터를 관리합니다.

- `schema.sql`: PostgreSQL DDL (테이블/제약/인덱스)
- `seeds/sample-data.sql`: 개발 및 QA용 샘플 데이터

## 샘플 데이터 적용

```bash
psql "$DATABASE_URL" -f db/schema.sql
psql "$DATABASE_URL" -f db/seeds/sample-data.sql
```

`schema.sql` 실행 후 `seeds/sample-data.sql`을 순차적으로 적용하면 샘플 유저/프로젝트/제안/이벤트 데이터가 동일한 상태로 재현됩니다.
