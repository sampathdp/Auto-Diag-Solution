-- Monthly subscription invoices sent by the platform to salon owners
CREATE TABLE IF NOT EXISTS salon_invoices (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  salon_id        INT NOT NULL,
  plan_id         INT NULL,
  invoice_number  VARCHAR(50) NOT NULL UNIQUE,
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  amount          DECIMAL(10,2) NOT NULL DEFAULT 0,
  billing_cycle   ENUM('monthly','yearly') NOT NULL DEFAULT 'monthly',
  status          ENUM('sent','paid','overdue','cancelled') NOT NULL DEFAULT 'sent',
  sent_at         DATETIME NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id)  REFERENCES subscription_plans(id) ON DELETE SET NULL
);
