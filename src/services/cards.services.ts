// Service layer = business rules and orchestration.
// It "decides" behavior (e.g., 404 if user does not exist)
// and uses the repository for DB operations.

import { CreateCardDTO } from "../dtos/card.dto";
import { CardsRepository } from "../repositories/cards.repository";

type ScryfallNamedResponse = {
  object: string;
  not_found?: boolean;
  image_uris?: {
    normal?: string;
    large?: string;
    png?: string;
    small?: string;
  };
  card_faces?: Array<{
    image_uris?: {
      normal?: string;
      large?: string;
      png?: string;
      small?: string;
    };
  }>;
};

async function checkIfCardExists(name: string) {
  const url = `https://api.scryfall.com/cards/named?exact=${name}`;

  const response = await fetch(url);

  if(!response){
    return undefined;
  } else {
    return response;
  }
  
}

function pickImageUrl(s: ScryfallNamedResponse): string | null {
  // carta normal
  const direct = s.image_uris?.normal ?? s.image_uris?.png ?? s.image_uris?.large ?? s.image_uris?.small;
  if (direct) return direct;

  // cartas “dupla face” (modal/transform etc)
  const face = s.card_faces?.[0]?.image_uris;
  const fromFace = face?.normal ?? face?.png ?? face?.large ?? face?.small;
  return fromFace ?? null;
}


export class CardsService {
// Receive the repository in the constructor
  constructor(private repo: CardsRepository) {}

  findAll(){
    return this.repo.findAllInDatabase();
  }

  findByOwnership(status: boolean){
    return this.repo.findByOwnership(status);
  }

  findById(id: string){
    return this.repo.findById(id);
  }

  async checkIfCartExistsBeforeSaving(name: string){
    const check = await checkIfCardExists(name);
    return check;
  }

  findByName(name: string){
    return this.repo.findByName(name);
  }

  deleteCard(id: string){
    return this.repo.deleteCard(id);
  }

  updateOwnership(id: string, own: boolean){

    return this.repo.updateOwnByName(id, own)
    

  }

  async cardExists(name: string){
    const url = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(
      name
    )}`;

    const resp = await fetch(url);

      if (!resp.ok) {
          return false;
    } else {
          return true;
    };
  }

   async createCard(data: CreateCardDTO) {

    const url = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(
      data.name
    )}`;

    const resp = await fetch(url);

      if (!resp.ok) {
          const payload = {
      ...data,
      image_url: 'not_available',
    };

    return this.repo.createCard(payload);

    }

    const scryfall: ScryfallNamedResponse = await resp.json();

    const imageUrl = scryfall.image_uris?.normal ?? "not_available";

    const payload = {
      ...data,
      image_url: imageUrl,
    };

    return this.repo.createCard(payload);
  }
}