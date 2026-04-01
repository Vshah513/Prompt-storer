// PromptVault — Data Store (Supabase Sync)
import { supabase } from './utils/supabase.js';

// ---- Image storage (Supabase 'images' table) ----
export async function saveImage(id, dataUrl) {
  const { data, error } = await supabase
    .from('images')
    .upsert({ id, data_url: dataUrl, created_at: Date.now() });
  
  if (error) {
    console.error('Error saving image:', error);
    throw error;
  }
  return id;
}

export async function getImage(id) {
  const { data, error } = await supabase
    .from('images')
    .select('data_url')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching image:', error);
    return null;
  }
  return data?.data_url || null;
}

export async function deleteImage(id) {
  const { error } = await supabase
    .from('images')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting image:', error);
    throw error;
  }
}

export async function getAllImages(ids) {
  if (!ids?.length) return [];
  const { data, error } = await supabase
    .from('images')
    .select('id, data_url')
    .in('id', ids);

  if (error) {
    console.error('Error fetching batch images:', error);
    return [];
  }
  return data || [];
}

// ---- Prompts (Supabase 'prompts' table) ----
export async function getPrompts() {
  const { data, error } = await supabase
    .from('prompts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching prompts:', error);
    return [];
  }

  // Map database fields to application camelCase
  return data.map(p => ({
    id: p.id,
    title: p.title,
    description: p.description,
    category: p.category_id,
    tags: p.tags || [],
    promptContent: p.prompt_content,
    outputText: p.output_text,
    imageIds: p.image_ids || [],
    fileName: p.file_name,
    favorite: p.favorite,
    createdAt: p.created_at,
    updatedAt: p.updated_at
  }));
}

export async function addPrompt(prompt) {
  const { data, error } = await supabase
    .from('prompts')
    .insert([{
      id: prompt.id,
      title: prompt.title,
      description: prompt.description,
      category_id: prompt.category,
      tags: prompt.tags,
      prompt_content: prompt.promptContent,
      output_text: prompt.outputText,
      image_ids: prompt.imageIds,
      file_name: prompt.fileName,
      favorite: prompt.favorite,
      created_at: prompt.createdAt,
      updated_at: prompt.updatedAt
    }])
    .select()
    .single();

  if (error) {
    console.error('Error adding prompt:', error);
    throw error;
  }
  return data;
}

export async function updatePrompt(id, updates) {
  const dbUpdates = {};
  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.category !== undefined) dbUpdates.category_id = updates.category;
  if (updates.tags !== undefined) dbUpdates.tags = updates.tags;
  if (updates.promptContent !== undefined) dbUpdates.prompt_content = updates.promptContent;
  if (updates.outputText !== undefined) dbUpdates.output_text = updates.outputText;
  if (updates.imageIds !== undefined) dbUpdates.image_ids = updates.imageIds;
  if (updates.fileName !== undefined) dbUpdates.file_name = updates.fileName;
  if (updates.favorite !== undefined) dbUpdates.favorite = updates.favorite;
  
  dbUpdates.updated_at = Date.now();

  const { data, error } = await supabase
    .from('prompts')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating prompt:', error);
    throw error;
  }
  return data;
}

export async function deletePrompt(id) {
  const { data: prompt } = await supabase
    .from('prompts')
    .select('image_ids')
    .eq('id', id)
    .single();

  if (prompt?.image_ids?.length) {
    for (const imgId of prompt.image_ids) {
      await deleteImage(imgId);
    }
  }

  const { error } = await supabase
    .from('prompts')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting prompt:', error);
    throw error;
  }
}

export async function toggleFavorite(id) {
  const { data: prompt } = await supabase
    .from('prompts')
    .select('favorite')
    .eq('id', id)
    .single();

  const newVal = !prompt.favorite;
  await updatePrompt(id, { favorite: newVal });
  return newVal;
}

// ---- Categories (Supabase 'categories' table) ----
export async function getCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
  return data;
}

export async function addCategory(cat) {
  const { data, error } = await supabase
    .from('categories')
    .insert([{
      id: cat.id,
      name: cat.name,
      icon: cat.icon,
      color: cat.color
    }])
    .select()
    .single();

  if (error) {
    console.error('Error adding category:', error);
    throw error;
  }
  return data;
}

export async function deleteCategory(id) {
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting category:', error);
    throw error;
  }
}

// ---- Canvas positions (Supabase 'canvas_positions' table) ----
export async function getCanvasPositions() {
  const { data, error } = await supabase
    .from('canvas_positions')
    .select('*');

  if (error) {
    console.error('Error fetching canvas positions:', error);
    return {};
  }

  const positions = {};
  data.forEach(p => {
    positions[p.prompt_id] = { x: p.x, y: p.y };
  });
  return positions;
}

export async function saveCanvasPosition(promptId, x, y) {
  const { error } = await supabase
    .from('canvas_positions')
    .upsert({ prompt_id: promptId, x, y });

  if (error) {
    console.error('Error saving canvas position:', error);
    throw error;
  }
}

export async function saveAllCanvasPositions(positions) {
  const data = Object.entries(positions).map(([prompt_id, pos]) => ({
    prompt_id,
    x: pos.x,
    y: pos.y
  }));

  const { error } = await supabase
    .from('canvas_positions')
    .upsert(data);

  if (error) {
    console.error('Error saving all canvas positions:', error);
    throw error;
  }
}

// ---- Settings ----
export async function getSettings() {
  const { data, error } = await supabase
    .from('settings')
    .select('*');

  if (error) {
    console.error('Error fetching settings:', error);
    return {};
  }

  const settings = {};
  data.forEach(s => {
    settings[s.key] = s.value;
  });
  return settings;
}

export async function saveSetting(key, value) {
  const { error } = await supabase
    .from('settings')
    .upsert({ key, value });

  if (error) {
    console.error('Error saving setting:', error);
    throw error;
  }
}

// ---- Category helper ----
export async function getCategoryById(id) {
  const categories = await getCategories();
  return categories.find(c => c.id === id) || { id, name: id, icon: '📁', color: 'cat-default' };
}
