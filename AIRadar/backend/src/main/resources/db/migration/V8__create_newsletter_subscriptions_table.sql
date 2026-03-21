CREATE TABLE newsletter_subscriptions (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email              VARCHAR(255) NOT NULL UNIQUE,
    job_category       VARCHAR(100),
    unsubscribe_token  UUID NOT NULL,
    is_subscribed      BOOLEAN NOT NULL DEFAULT TRUE,
    subscribed_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    unsubscribed_at    TIMESTAMP,
    created_at         TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_newsletter_subscriptions_unsubscribe_token
    ON newsletter_subscriptions(unsubscribe_token);
