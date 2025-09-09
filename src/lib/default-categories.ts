// src/lib/default-categories.ts
import { createClient } from './supabase/client';

import { defaultCategoriesTree, type CategoryNode } from './categories-data';


/**
 * Seeds the database with default categories for a new business using a hierarchical structure.
 * This function is non-destructive. It will only add categories that do not already exist.
 * @param businessId - The ID of the business to seed categories for.
 */
export async function seedDefaultCategories(businessId: string) {
  const supabase = createClient();
  
  if (!businessId) {
    console.error("Business ID is required to seed default categories.");
    return;
  }

  try {
    // 1. Fetch all existing categories for the business to avoid duplicates.
    const { data: existingCategories, error: fetchError } = await supabase
      .from('categories')
      .select('name, parent_id')
      .eq('businessid', businessId);

    if (fetchError) {
      console.error('Error fetching existing categories:', fetchError);
      throw fetchError;
    }

    // Create a Set for quick lookup of existing categories, using a "name|parent_id" key.
    const existingCategorySet = new Set(
      existingCategories.map(c => `${c.name}|${c.parent_id || 'null'}`)
    );

    // 2. Recursive function to insert categories and their children if they don't exist.
    const insertMissingCategory = async (categoryNode: CategoryNode, parentId: string | null = null) => {
      const categoryKey = `${categoryNode.name}|${parentId || 'null'}`;
      let currentCategoryId = null;

      // Check if the category already exists.
      if (existingCategorySet.has(categoryKey)) {
        // If it exists, we need to find its ID to use for its children.
        const { data: found, error: findError } = await supabase
            .from('categories')
            .select('id')
            .eq('businessid', businessId)
            .eq('name', categoryNode.name)
            .eq('parent_id', parentId) // This might fail if parentId is null, handle below
            .limit(1)
            .single();
        
        if (findError && parentId) { // Retry for null parent_id if first attempt fails
             const { data: foundNullParent, error: findNullError } = await supabase
                .from('categories')
                .select('id')
                .eq('businessid', businessId)
                .eq('name', categoryNode.name)
                .is('parent_id', null)
                .limit(1)
                .single();
            if (findNullError) console.error("Could not find existing category ID", findNullError);
            else currentCategoryId = foundNullParent?.id;
        } else {
            currentCategoryId = found?.id;
        }

      } else {
        // If it does not exist, insert it.
        const { data: insertedData, error: insertError } = await supabase
          .from('categories')
          .insert({
            name: categoryNode.name,
            type: categoryNode.type,
            businessid: businessId,
            parent_id: parentId,
          })
          .select('id')
          .single();

        if (insertError) {
          console.error(`Error inserting category '${categoryNode.name}':`, insertError);
          // Don't throw, continue with other categories
        } else {
          currentCategoryId = insertedData.id;
        }
      }

      // If there are children, insert them recursively using the ID of the current category.
      if (currentCategoryId && categoryNode.children && categoryNode.children.length > 0) {
        for (const childNode of categoryNode.children) {
          await insertMissingCategory(childNode, currentCategoryId);
        }
      }
    };

    // Start inserting from the root of the tree
  for (const rootNode of defaultCategoriesTree) {
      await insertMissingCategory(rootNode);
    }

    console.log(`Default categories seeding completed for business ${businessId}`);
  } catch (error) {
    console.error("An unexpected error occurred while seeding categories:", error);
  }
}
