"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderFactory = void 0;
const index_js_1 = require("../../config/index.js");
const MockAIProvider_js_1 = require("./MockAIProvider.js");
const OpenAIProvider_js_1 = require("./OpenAIProvider.js");
let defaultProviderInstance = null;
class ProviderFactory {
    static getProvider(providerName) {
        if (defaultProviderInstance) {
            return defaultProviderInstance;
        }
        if (index_js_1.config.isTest) {
            return new MockAIProvider_js_1.MockAIProvider();
        }
        const name = providerName?.toLowerCase() || 'openai';
        switch (name) {
            case 'mock':
                return new MockAIProvider_js_1.MockAIProvider();
            case 'openai':
            default:
                return new OpenAIProvider_js_1.OpenAIProvider();
        }
    }
    static setGlobalProvider(provider) {
        defaultProviderInstance = provider;
    }
}
exports.ProviderFactory = ProviderFactory;
//# sourceMappingURL=ProviderFactory.js.map