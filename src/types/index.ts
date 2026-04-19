export type Designation = '国指定' | '都道府県指定' | '市区町村指定' | '無指定';

export type SourceName =
  | '新日本名木100選'
  | '森の巨人たち100選'
  | 'ユーザー投稿'
  | 'HARDWOOD投稿';

export const SOURCE_NAMES: SourceName[] = [
  '新日本名木100選',
  '森の巨人たち100選',
  'ユーザー投稿',
  'HARDWOOD投稿',
];

export interface Tree {
  id: string;
  name: string;
  species: string;
  latitude: number | null;
  longitude: number | null;
  address: string;
  description: string | null;
  trunk_circumference_cm: number | null;
  height_m: number | null;
  age_years: number | null;
  designation: Designation;
  source_name: SourceName | null;
  cover_image_url: string | null;
  submitted_by: string | null;
  created_at: string;
  // joined
  posts?: Post[];
  evaluations?: Evaluation[];
}

export interface Post {
  id: string;
  tree_id: string;
  author_name: string;
  content: string;
  image_url: string | null;
  visited_at: string | null;
  created_at: string;
}

export interface Evaluation {
  id: string;
  tree_id: string;
  evaluator_name: string;
  health_score: 1 | 2 | 3 | 4 | 5;
  vitality: string | null;
  disease_notes: string | null;
  recommendation: string | null;
  evaluated_at: string;
  created_at: string;
}

export type TreeInsert = Omit<Tree, 'id' | 'created_at' | 'posts' | 'evaluations'>;
export type PostInsert = Omit<Post, 'id' | 'created_at'>;
export type EvaluationInsert = Omit<Evaluation, 'id' | 'created_at'>;
