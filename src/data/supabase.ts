import type {SupabaseClient} from '@supabase/supabase-js';
import {createClient} from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient => {
	if (supabaseInstance) {
		return supabaseInstance;
	}

	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

	if (!supabaseUrl || !supabaseAnonKey) {
		const missing = [];
		if (!supabaseUrl) {missing.push('NEXT_PUBLIC_SUPABASE_URL');}
		if (!supabaseAnonKey) {missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');}

		throw new Error(
			`Missing required Supabase environment variables: ${missing.join(', ')}\n` +
			'Get your credentials from: https://supabase.com/dashboard/project/_/settings/api\n' +
			'NEXT_PUBLIC_SUPABASE_URL should be your project URL (e.g., https://xxx.supabase.co)\n' +
			'NEXT_PUBLIC_SUPABASE_ANON_KEY should be your anon/public API key'
		);
	}

	supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
	return supabaseInstance;
};
