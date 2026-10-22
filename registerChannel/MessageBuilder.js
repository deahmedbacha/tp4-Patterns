
export class MessageBuilder {
  constructor() {
    this.destinataire = null;
    this.gabarit = null;
    this.variables = {};
    this.priorite = 'normale';
  }

  to(destinataire) {
    this.destinataire = destinataire;
    return this;
  }

  template(gabarit) {
    this.gabarit = gabarit;
    return this;
  }

  with(nom, valeur) {
    this.variables[nom] = valeur;
    return this;
  }

  priority(priorite) {
    this.priorite = priorite;
    return this;
  }

  build() {
    if (!this.destinataire) {
      throw new Error('Destinataire obligatoire');
    }

    if (!this.gabarit) {
      throw new Error('Gabarit obligatoire');
    }

    if (!['basse', 'normale', 'haute'].includes(this.priorite)) {
      throw new Error(`Priorité invalide : ${this.priorite}`);
    }

    const body = this.gabarit.replace(
      /\{\{(\w+)\}\}/g,
      (match, nom) => {
        if (!Object.hasOwn(this.variables, nom)) {
          throw new Error(`Variable manquante : ${nom}`);
        }

        return String(this.variables[nom]);
      }
    );

    return Object.freeze({
      to: this.destinataire,
      body,
      priority: this.priorite
    });
  }
}
