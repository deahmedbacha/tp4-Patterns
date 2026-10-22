# tp4 - patterns shoplite

### factory method

on utilise une factory pour creer les canaux email sms push et slack

au lieu de faire plusieurs if on utilise un registre

comme ca on peut ajouter slack sans modifier channels.js

### builder

on utilise le builder pour creer les messages et verifier les informations dans build()

c'est plus simple qu'un constructeur avec beaucoup de parametres

### adapter

colissimo et dhl utilisent des formats differents

avec les adapters on peut appeler getQuote pour les deux

comme ca on evite de mettre les conversions dans ShippingService

### decorator

on utilise retry pour reessayer si dhl ne repond pas

et cache pour eviter de demander plusieurs fois le meme tarif

c'est plus pratique que de modifier directement les adapters

### ordre des decorators

on met cache autour de retry pour garder les devis qui ont reussi

comme ca si le devis est deja en cache on ne refait pas les appels

### facade

ShippingService compare les tarifs et choisit le moins cher

si deux transporteurs ont le meme prix il choisit le plus rapide

c'est plus simple que de faire toutes les comparaisons dans main.js
