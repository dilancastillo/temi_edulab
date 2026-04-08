import { expect, test } from "@playwright/test";

test("teacher can enter the local demo and open the student directory", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page.getByRole("heading", { name: /Bienvenido, Profesor/i })).toBeVisible();

  await page.getByRole("link", { name: "Estudiantes" }).click();
  await expect(page.getByRole("heading", { name: "Directorio de Estudiantes" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Agregar estudiante" })).toBeVisible();
});

test("student can enter and open a Blockly mission", async ({ page }) => {
  await page.goto("/estudiante/login");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { name: /Construye, prueba y envía tu misión/i })).toBeVisible();

  await page.getByRole("link", { name: /Continuar/i }).first().click();
  await expect(page.getByRole("heading", { name: "Ordena los pasos" })).toBeVisible();
  await expect(page.getByText(/Siguiente bloque: Cuando inicia/i)).toBeVisible();
});
