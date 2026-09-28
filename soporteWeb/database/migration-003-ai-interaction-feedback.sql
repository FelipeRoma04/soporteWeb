USE soporte_web;

SET @source_article_ids_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'ai_interactions' AND column_name = 'source_article_ids');
SET @source_article_ids_sql = IF(@source_article_ids_exists = 0, 'ALTER TABLE ai_interactions ADD COLUMN source_article_ids JSON NULL AFTER answer', 'SELECT 1');
PREPARE source_article_ids_statement FROM @source_article_ids_sql;
EXECUTE source_article_ids_statement;
DEALLOCATE PREPARE source_article_ids_statement;

SET @rating_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'ai_interactions' AND column_name = 'rating');
SET @rating_sql = IF(@rating_exists = 0, 'ALTER TABLE ai_interactions ADD COLUMN rating ENUM(''helpful'', ''not_helpful'') NULL AFTER source_article_ids', 'SELECT 1');
PREPARE rating_statement FROM @rating_sql;
EXECUTE rating_statement;
DEALLOCATE PREPARE rating_statement;

SET @rated_at_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'ai_interactions' AND column_name = 'rated_at');
SET @rated_at_sql = IF(@rated_at_exists = 0, 'ALTER TABLE ai_interactions ADD COLUMN rated_at TIMESTAMP NULL AFTER rating', 'SELECT 1');
PREPARE rated_at_statement FROM @rated_at_sql;
EXECUTE rated_at_statement;
DEALLOCATE PREPARE rated_at_statement;