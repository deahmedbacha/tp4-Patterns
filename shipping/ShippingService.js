export class ShippingService {
  constructor(carriers) {
    this.carriers = carriers;
  }

  async bestQuote(parcel) {
    const results = await Promise.allSettled(
      this.carriers.map(carrier => carrier.getQuote(parcel))
    );

    const quotes = results
      .filter(result => result.status === 'fulfilled')
      .map(result => result.value);

    if (quotes.length === 0) {
      throw new Error('Aucun transporteur disponible');
    }

    quotes.sort((a, b) => {
      if (a.price !== b.price) {
        return a.price - b.price;
      }

      return a.days - b.days;
    });

    return quotes[0];
  }
}
