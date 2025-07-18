import { supabase } from '@/utils/supabaseClient';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { id, username, full_name, avatar_url, language_preference, notification_preference } = await req.json();
  
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert({
        id,
        username,
        full_name,
        avatar_url,
        language_preference,
        notification_preference
      })
      .select();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Database update failed' },
      { status: 500 }
    );
  }
}