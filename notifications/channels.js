export class Channel {
  send(message) {
    throw new Error('méthode abstraite');
  }
}

export class EmailChannel extends Channel {
  send(message) {
    return `[EMAIL → ${message.to}] ${message.body}`;
  }
}

export class SmsChannel extends Channel {
  send(message) {
    return `[SMS → ${message.to}] ${message.body.slice(0, 160)}`;
  }
}

export class PushChannel extends Channel {
  send(message) {
    return `[PUSH → ${message.to}] ${message.body}`;
  }
}

// Registre des canaux
const channels = new Map();

export function registerChannel(type, Classe) {
  if (
    typeof Classe !== 'function' ||
    !(Classe.prototype instanceof Channel)
  ) {
    throw new Error('Classe de canal invalide');
  }

  channels.set(type, Classe);
}

export function createChannel(type) {
  const Classe = channels.get(type);

  if (!Classe) {
    throw new Error(`Canal inconnu : ${type}`);
  }

  return new Classe();
}

// Canaux disponibles par defaut
registerChannel('email', EmailChannel);
registerChannel('sms', SmsChannel);
registerChannel('push', PushChannel);

