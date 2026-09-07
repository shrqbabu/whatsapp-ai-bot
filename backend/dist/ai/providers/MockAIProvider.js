"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockAIProvider = void 0;
class MockAIProvider {
    name = 'mock';
    customReplyGenerator;
    constructor(customReplyGenerator) {
        this.customReplyGenerator = customReplyGenerator;
    }
    setCustomReply(fn) {
        this.customReplyGenerator = fn;
    }
    async generateReply(context) {
        if (this.customReplyGenerator) {
            return this.customReplyGenerator(context);
        }
        const text = context.incomingMessage.toLowerCase();
        if (text.includes('hello') || text.includes('hi')) {
            return 'Hello! How can I assist you today?';
        }
        if (text.includes('price') || text.includes('cost')) {
            return 'Our plans start from $29/month. Would you like more details?';
        }
        if (text.includes('help')) {
            return 'I am here to help you. What issue are you experiencing?';
        }
        return `Thank you for your message regarding: "${context.incomingMessage}". Our team is here to support you!`;
    }
}
exports.MockAIProvider = MockAIProvider;
//# sourceMappingURL=MockAIProvider.js.map