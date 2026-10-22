import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MessageBuilder } from './registerChannel/MessageBuilder.js';


import { ColissimoApi, DhlClient } from './tp4/carrierApis.js';
import {ColissimoAdapter, DhlAdapter } from './shipping/adapters.js';
import {RetryQuote, CachedQuote } from './shipping/decorators.js';
import { ShippingService } from './shipping/ShippingService.js';




import {
  Channel,
  createChannel,
  registerChannel
} from './notifications/channels.js';

import './registerChannel/slack.js';

test('Factory : un canal par type', () => {
  const message = {
    to: 'alice@exemple.fr',
    body: 'Bonjour',
    priority: 'normale'
  };

  assert.equal(
    createChannel('email').send(message),
    '[EMAIL → alice@exemple.fr] Bonjour'
  );

  assert.equal(
    createChannel('sms').send(message),
    '[SMS → alice@exemple.fr] Bonjour'
  );

  assert.equal(
    createChannel('push').send(message),
    '[PUSH → alice@exemple.fr] Bonjour'
  );
});

test('Factory : type inconnu refuse', () => {
  assert.throws(
    () => createChannel('telegram'),
    /Canal inconnu/
  );
});

test('Factory OCP : Slack ajoute sans modifier channels.js', () => {
  const slack = createChannel('slack');

  assert.equal(
    slack.send({ to: 'logistique', body: 'Colis pret' }),
    '[SLACK #logistique] Colis pret'
  );
});

test('Factory : classe invalide refusee', () => {
  class MauvaisCanal {}

  assert.throws(
    () => registerChannel('invalide', MauvaisCanal),
    /Classe de canal invalide/
  );
});

test('Factory : SMS limite a 160 caracteres', () => {
  const message = {
    to: '0600000000',
    body: 'A'.repeat(200)
  };

  const result = createChannel('sms').send(message);

  assert.equal(
    result,
    `[SMS → 0600000000] ${'A'.repeat(160)}`
  );
});

test('Factory : classe abstraite', () => {
  assert.throws(
    () => new Channel().send({}),
    /méthode abstraite/
  );
});



test('Builder : message valide', () => {
  const message = new MessageBuilder()
    .to('alice@exemple.fr')
    .template('Bonjour {{nom}}, votre colis part avec {{transporteur}}.')
    .with('nom', 'Alice')
    .with('transporteur', 'Colissimo')
    .priority('haute')
    .build();

  assert.deepEqual(message, {
    to: 'alice@exemple.fr',
    body: 'Bonjour Alice, votre colis part avec Colissimo.',
    priority: 'haute'
  });
});

test('Builder : destinataire obligatoire', () => {
  assert.throws(
    () => new MessageBuilder()
      .template('Bonjour')
      .build(),
    /Destinataire obligatoire/
  );
});

test('Builder : gabarit obligatoire', () => {
  assert.throws(
    () => new MessageBuilder()
      .to('alice@exemple.fr')
      .build(),
    /Gabarit obligatoire/
  );
});

test('Builder : priorite invalide', () => {
  assert.throws(
    () => new MessageBuilder()
      .to('alice@exemple.fr')
      .template('Bonjour')
      .priority('urgente')
      .build(),
    /Priorité invalide : urgente/
  );
});

test('Builder : variable manquante', () => {
  assert.throws(
    () => new MessageBuilder()
      .to('alice@exemple.fr')
      .template('Bonjour {{nom}}')
      .build(),
    /Variable manquante : nom/
  );
});

test('Builder : message immuable', () => {
  const message = new MessageBuilder()
    .to('alice@exemple.fr')
    .template('Bonjour')
    .build();

  assert.equal(message.priority, 'normale');
  assert.equal(Object.isFrozen(message), true);

  assert.throws(() => {
    message.body = 'Message modifie';
  }, TypeError);

  assert.equal(message.body, 'Bonjour');
});




test('Adapter : Colissimo retourne un devis normalise', async () => {
  const adapter = new ColissimoAdapter(new ColissimoApi());

  const quote = await adapter.getQuote({
    weightKg: 2,
    zip: '75011'
  });

  assert.deepEqual(quote, {
    carrier: 'Colissimo',
    price: 9.95,
    days: 2
  });
});

test('Adapter : DHL retourne un devis normalise', async () => {
  const adapter = new DhlAdapter(new DhlClient());

  const quote = await adapter.getQuote({
    weightKg: 2,
    zip: '75011'
  });

  assert.deepEqual(quote, {
    carrier: 'DHL',
    price: 11,
    days: 1
  });
});

test('Decorator Retry : reussit apres deux erreurs', async () => {
  const client = new DhlClient({ failFirst: 2 });

  const adapter = new RetryQuote(
    new DhlAdapter(client),
    { attempts: 3 }
  );

  const quote = await adapter.getQuote({
    weightKg: 2,
    zip: '75011'
  });

  assert.equal(quote.price, 11);
  assert.equal(client.calls, 3);
});

test('Decorator Retry : abandonne apres trois erreurs', async () => {
  const client = new DhlClient({ failFirst: 5 });

  const adapter = new RetryQuote(
    new DhlAdapter(client),
    { attempts: 3 }
  );

  await assert.rejects(
    () => adapter.getQuote({
      weightKg: 2,
      zip: '75011'
    }),
    /503 Service Unavailable/
  );

  assert.equal(client.calls, 3);
});

test('Decorator Cache : evite le deuxieme appel', async () => {
  const client = new DhlClient();

  const adapter = new CachedQuote(
    new DhlAdapter(client)
  );

  const parcel = { weightKg: 2, zip: '75011' };

  const first = await adapter.getQuote(parcel);
  const second = await adapter.getQuote(parcel);

  assert.deepEqual(first, second);
  assert.equal(client.calls, 1);
});

test('Decorator Cache : expire apres le TTL', async () => {
  let time = 0;
  const client = new DhlClient();

  const adapter = new CachedQuote(
    new DhlAdapter(client),
    {
      ttlMs: 1000,
      now: () => time
    }
  );

  const parcel = { weightKg: 2, zip: '75011' };

  await adapter.getQuote(parcel);
  assert.equal(client.calls, 1);

  time = 500;

  await adapter.getQuote(parcel);
  assert.equal(client.calls, 1);

  time = 1001;

  await adapter.getQuote(parcel);
  assert.equal(client.calls, 2);
});

test('Decorator : Cache et Retry sont composables', async () => {
  const client = new DhlClient({ failFirst: 1 });

  const adapter = new CachedQuote(
    new RetryQuote(
      new DhlAdapter(client)
    )
  );

  const parcel = { weightKg: 2, zip: '75011' };

  const first = await adapter.getQuote(parcel);
  const second = await adapter.getQuote(parcel);

  assert.equal(first.price, 11);
  assert.deepEqual(first, second);
  assert.equal(client.calls, 2);
});





test('Facade : 2 kg Colissimo est le moins cher', async () => {
  const shipping = new ShippingService([
    new ColissimoAdapter(new ColissimoApi()),
    new DhlAdapter(new DhlClient())
  ]);

  const best = await shipping.bestQuote({ weightKg: 2, zip: '75011' });

  assert.equal(best.carrier, 'Colissimo');
  assert.equal(best.price, 9.95);
});

test('Facade : 10 kg DHL est le moins cher', async () => {
  const shipping = new ShippingService([
    new ColissimoAdapter(new ColissimoApi()),
    new DhlAdapter(new DhlClient())
  ]);

  const best = await shipping.bestQuote({ weightKg: 10, zip: '75011' });

  assert.equal(best.carrier, 'DHL');
  assert.equal(best.price, 23);
});

test('Facade : choisit le plus rapide en cas d egalite', async () => {
  const shipping = new ShippingService([
    { getQuote: async () => ({ carrier: 'A', price: 10, days: 3 }) },
    { getQuote: async () => ({ carrier: 'B', price: 10, days: 1 }) }
  ]);

  const best = await shipping.bestQuote({ weightKg: 2, zip: '75011' });

  assert.equal(best.carrier, 'B');
});

test('Facade : ignore un transporteur en panne', async () => {
  const shipping = new ShippingService([
    { getQuote: async () => { throw new Error('503'); } },
    new ColissimoAdapter(new ColissimoApi())
  ]);

  const best = await shipping.bestQuote({ weightKg: 2, zip: '75011' });

  assert.equal(best.carrier, 'Colissimo');
});

test('Facade : aucun transporteur disponible', async () => {
  const shipping = new ShippingService([]);

  await assert.rejects(
    () => shipping.bestQuote({ weightKg: 2, zip: '75011' }),
    /Aucun transporteur disponible/
  );
});
