import { Channel, registerChannel } from '../notifications/channels.js';

export class SlackChannel extends Channel {
  send(message) {
    return `[SLACK #${message.to}] ${message.body}`;
  }
}

registerChannel('slack', SlackChannel);
