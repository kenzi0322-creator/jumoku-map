import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { PostInsert } from '@/types';

export async function POST(req: Request) {
  const body: PostInsert = await req.json();
  const { data, error } = await supabase.from('posts').insert(body).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
