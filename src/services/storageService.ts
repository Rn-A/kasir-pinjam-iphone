export const StorageService = {
  async uploadItemImage(file: File): Promise<string> {
    // Return base64 for preview/local storage
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  },

  async deleteImage(url: string): Promise<void> {
    // No-op for base64/local images
    return;
  }
};
