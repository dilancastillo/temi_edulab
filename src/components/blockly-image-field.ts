import * as Blockly from "blockly";

/**
 * Custom Blockly field for loading images in temi_condition blocks
 * Displays a clickable label that opens a file picker
 */
export class FieldImageLoader extends Blockly.Field {
  private hasImage: boolean = false;
  private onImageSelected: ((base64: string) => void) | null = null;

  constructor(
    value?: string,
    validator?: Blockly.FieldValidator,
    config?: any
  ) {
    super(value || "", validator, config);
    this.hasImage = !!value;
  }

  static fromJson(options: any) {
    return new FieldImageLoader(options.value);
  }

  override doClassValidation_(newValue?: string | number | boolean | null): string | null {
    this.hasImage = !!newValue;
    return newValue as string | null;
  }

  override render_() {
    super.render_();
    const textElement = this.getTextElement?.();
    if (textElement) {
      // Show clear visual indicator
      if (this.hasImage) {
        textElement.textContent = "✅ Imagen cargada";
        textElement.style.color = "#4CAF50"; // Green
        textElement.style.fontWeight = "bold";
      } else {
        textElement.textContent = "❌ Imagen no cargada";
        textElement.style.color = "#FF9800"; // Orange
        textElement.style.fontWeight = "normal";
      }
      textElement.style.cursor = "pointer";
      textElement.style.textDecoration = "underline";
      textElement.style.paddingLeft = "12px";
      textElement.style.paddingRight = "12px";
      textElement.style.minWidth = "140px";
      textElement.style.display = "inline-block";
      textElement.style.textAlign = "center";
    }
  }

  override showEditor_() {
    // Open file picker instead of default editor
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event: any) => {
          const base64 = event.target.result;
          this.setValue(base64);
          this.hasImage = true;
          this.render_();
          if (this.onImageSelected) {
            this.onImageSelected(base64);
          }
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  }

  setOnImageSelected(callback: (base64: string) => void) {
    this.onImageSelected = callback;
  }
}

// Register the custom field
Blockly.fieldRegistry.register("field_image_loader", FieldImageLoader);
