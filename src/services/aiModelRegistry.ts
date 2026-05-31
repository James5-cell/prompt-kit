import { SUPPORTED_MODELS, FALLBACK_CONFIG, type AIModelConfig } from '../config/aiModels';
import { firebaseService } from '../storage/firebase';

class AIModelRegistry {
  /**
   * Fetches the dynamic model list from Firestore, flattening it into the expected format.
   * Falls back to local SUPPORTED_MODELS if Firebase fails or is empty.
   */
  async getModels(): Promise<AIModelConfig[]> {
    try {
      const cloudConfig = await firebaseService.getAiModelsConfig();
      if (cloudConfig && Array.isArray(cloudConfig) && cloudConfig.length > 0) {
        const flatModels: AIModelConfig[] = [];
        cloudConfig.forEach((providerConfig: any) => {
          if (providerConfig.models && Array.isArray(providerConfig.models)) {
            providerConfig.models.forEach((m: any) => {
              flatModels.push({
                id: m.id,
                name: m.name,
                provider: providerConfig.id,
              });
            });
          }
        });
        if (flatModels.length > 0) {
          return flatModels;
        }
      }
    } catch (error) {
      console.error('Failed to fetch models from Firebase, using fallback:', error);
    }
    
    return SUPPORTED_MODELS;
  }

  async getModelsForProvider(provider: string): Promise<AIModelConfig[]> {
    const models = await this.getModels();
    return models.filter((m) => m.provider === provider);
  }

  getDefaultConfig() {
    return FALLBACK_CONFIG;
  }
}

export const aiModelRegistry = new AIModelRegistry();
