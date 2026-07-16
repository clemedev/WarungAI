import { supabase } from './supabase.js';

export async function signUp(
  email,
  password,
  displayName,
) {
  const { data, error } =
    await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          display_name:
            displayName.trim(),
        },
      },
    });

  if (error) {
    throw error;
  }

  return data;
}

export async function signIn(
  email,
  password,
) {
  const { data, error } =
    await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

  if (error) {
    throw error;
  }

  return data;
}

export async function signOut() {
  const { error } =
    await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}

export async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    return null;
  }

  return user;
}

export function onAuthStateChange(callback) {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(
    (_event, session) => {
      callback(session?.user ?? null);
    },
  );

  return () => {
    subscription.unsubscribe();
  };
}
