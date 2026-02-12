import { supabaseInsert, supabaseSelect } from '@/lib/supabase';

export type SpotType = 'dogrun' | 'vet' | 'cafe';

export type Spot = {
  id: string;
  name: string;
  type: SpotType;
  latitude: number;
  longitude: number;
  created_by_external_id?: string | null;
  created_by_name?: string | null;
  created_at?: string;
};

export type Review = {
  id: string;
  spot_id: string;
  author_external_id?: string | null;
  author_name: string;
  rating: number;
  comment: string;
  created_at?: string;
};

export async function listSpots() {
  return supabaseSelect<Spot[]>(
    'spots?select=id,name,type,latitude,longitude,created_by_external_id,created_by_name,created_at&order=created_at.desc'
  );
}

export async function createSpot(input: Omit<Spot, 'id' | 'created_at'>) {
  const rows = await supabaseInsert<Spot[]>('spots', input);
  return rows[0];
}

export async function listReviews(spotId: string) {
  return supabaseSelect<Review[]>(
    `reviews?select=id,spot_id,author_external_id,author_name,rating,comment,created_at&spot_id=eq.${spotId}&order=created_at.desc`
  );
}

export async function createReview(input: Omit<Review, 'id' | 'created_at'>) {
  const rows = await supabaseInsert<Review[]>('reviews', input);
  return rows[0];
}
