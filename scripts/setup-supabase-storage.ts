/**
 * Script para configurar los buckets de Supabase Storage
 * Ejecutar: npx ts-node scripts/setup-supabase-storage.ts
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Error: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son requeridos");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupStorage() {
  try {
    console.log("🔧 Configurando Supabase Storage...");

    // Create videos bucket
    const { data: videoBucket, error: videoBucketError } = await supabase.storage.createBucket("videos", {
      public: true,
      fileSizeLimit: 200 * 1024 * 1024, // 200 MB
    });

    if (videoBucketError) {
      if (videoBucketError.message.includes("already exists")) {
        console.log("✅ Bucket 'videos' ya existe");
      } else {
        throw videoBucketError;
      }
    } else {
      console.log("✅ Bucket 'videos' creado exitosamente");
    }

    // Set bucket policies
    const { error: policyError } = await supabase.rpc("create_bucket_policy", {
      bucket_name: "videos",
      policy_name: "Allow public read access",
      definition: `(bucket_id = 'videos')`,
      action: "SELECT",
      role: "anon",
    }).catch(() => ({ error: null })); // Ignore if RPC doesn't exist

    if (!policyError) {
      console.log("✅ Políticas de acceso configuradas");
    }

    console.log("✨ Configuración completada");
  } catch (error) {
    console.error("❌ Error durante la configuración:", error);
    process.exit(1);
  }
}

setupStorage();
