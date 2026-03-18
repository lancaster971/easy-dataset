/**
 * Claude Code provider - usa Claude Agent SDK per chiamate LLM tramite abbonamento Max.
 * Non estende BaseClient perché non usa Vercel AI SDK (generateText/streamText).
 * Standalone: sovrascrive completamente chat(), chatStream(), chatStreamAPI().
 */

class ClaudeCodeClient {
  constructor(config) {
    this.model = config.model || 'claude-sonnet-4-6';
  }

  /**
   * Import dinamico dell'Agent SDK (ESM-only)
   */
  async _importSDK() {
    const sdk = await import('@anthropic-ai/claude-agent-sdk');
    return sdk.query;
  }

  /**
   * Converte messaggi in formato prompt stringa per query()
   */
  _buildPrompt(messages) {
    return messages
      .map(msg => {
        const role = msg.role === 'system' ? 'System' : msg.role === 'assistant' ? 'Assistant' : 'User';
        const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
        return `${role}: ${content}`;
      })
      .join('\n\n');
  }

  /**
   * chat (output normale) - non usa generateText
   */
  async chat(messages, options) {
    const queryFn = await this._importSDK();
    const prompt = this._buildPrompt(messages);

    let resultText = '';
    for await (const msg of queryFn({
      prompt,
      options: {
        model: this.model,
        maxTurns: 1,
        allowedTools: []
      }
    })) {
      if (msg.type === 'result') {
        resultText = msg.result;
      }
    }

    // Estrae reasoning se presente nel formato <think>...</think>
    let text = resultText;
    let reasoning = '';
    const thinkMatch = text.match(/^<think>([\s\S]*?)<\/think>\s*/);
    if (thinkMatch) {
      reasoning = thinkMatch[1].trim();
      text = text.slice(thinkMatch[0].length);
    }

    return { text, reasoning };
  }

  /**
   * chatStream - streaming con partial messages
   */
  async chatStream(messages, options) {
    const queryFn = await this._importSDK();
    const prompt = this._buildPrompt(messages);
    const encoder = new TextEncoder();
    const model = this.model;

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const message of queryFn({
            prompt,
            options: {
              model: model,
              maxTurns: 1,
              allowedTools: [],
              includePartialMessages: true
            }
          })) {
            if (message.type === 'stream_event') {
              const event = message.event;
              if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
                controller.enqueue(encoder.encode(event.delta.text));
              }
            }
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive'
      }
    });
  }

  /**
   * chatStreamAPI - streaming con supporto reasoning/thinking chain
   */
  async chatStreamAPI(messages, options) {
    const queryFn = await this._importSDK();
    const prompt = this._buildPrompt(messages);
    const encoder = new TextEncoder();
    const model = this.model;

    const stream = new ReadableStream({
      async start(controller) {
        let isThinking = false;

        const sendContent = text => {
          if (!text) return;
          try {
            if (isThinking) {
              controller.enqueue(encoder.encode('</think>'));
              isThinking = false;
            }
            controller.enqueue(encoder.encode(text));
          } catch (e) {
            if (e.code === 'ERR_INVALID_STATE' || e.message?.includes('closed')) return;
          }
        };

        const sendReasoning = text => {
          if (!text) return;
          try {
            if (!isThinking) {
              controller.enqueue(encoder.encode('<think>'));
              isThinking = true;
            }
            controller.enqueue(encoder.encode(text));
          } catch (e) {
            if (e.code === 'ERR_INVALID_STATE' || e.message?.includes('closed')) return;
          }
        };

        try {
          for await (const message of queryFn({
            prompt,
            options: {
              model: model,
              maxTurns: 1,
              allowedTools: [],
              includePartialMessages: true
            }
          })) {
            if (message.type === 'stream_event') {
              const event = message.event;
              if (event.type === 'content_block_delta') {
                if (event.delta.type === 'thinking_delta' || event.delta.type === 'reasoning_delta') {
                  sendReasoning(event.delta.thinking || event.delta.text || '');
                } else if (event.delta.type === 'text_delta') {
                  sendContent(event.delta.text);
                }
              }
            }
          }

          if (isThinking) {
            try {
              controller.enqueue(encoder.encode('</think>'));
            } catch (e) {
              /* ignore */
            }
          }
          try {
            controller.close();
          } catch (e) {
            /* ignore */
          }
        } catch (error) {
          if (error.code === 'ERR_INVALID_STATE') return;
          console.error('Claude Code streaming error:', error);
          if (isThinking) {
            try {
              controller.enqueue(encoder.encode('</think>'));
            } catch (e) {
              /* ignore */
            }
          }
          try {
            controller.error(error);
          } catch (e) {
            /* ignore */
          }
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive'
      }
    });
  }
}

module.exports = ClaudeCodeClient;
