-- RFQ Attachments: store files as base64 (matches existing pattern for quote PDFs)
CREATE TABLE rfq_attachments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    rfq_id uuid REFERENCES rfqs(id) ON DELETE CASCADE,
    filename text NOT NULL,
    file_size integer,
    mime_type text,
    file_base64 text NOT NULL,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE rfq_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage rfq_attachments"
    ON rfq_attachments FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
