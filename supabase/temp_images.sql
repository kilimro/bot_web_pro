CREATE TABLE IF NOT EXISTS temp_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_data text NOT NULL,
  created_at timestamptz DEFAULT now()
);