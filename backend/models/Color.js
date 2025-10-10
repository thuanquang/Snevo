// backend/models/Color.js
import createSupabaseConfig from '../../config/supabase.js';

import BaseModel from '../utils/BaseModel.js';
import constants from '../../config/constants.js';

const supabaseConfig = createSupabaseConfig();

class Color extends BaseModel {
  constructor() {
    super(constants.DATABASE_TABLES.COLORS || 'colors', 'color_id');
    
    this.fillable = ['color_name', 'hex_code', 'is_active'];

    this.validationRules = {
      color_name: {
        required: true,
        type: 'string',
        minLength: 2,
        maxLength: 50
      },
      hex_code: {
        required: false,
        type: 'string',
        pattern: /^#[0-9A-Fa-f]{6}$/
      },
      is_active: {
        required: false,
        type: 'boolean'
      }
    };
  }

  async findActive() {
    try {
      const { data, error } = await supabaseConfig.getAdminClient()
        .from(this.tableName)
        .select('*')
        .eq('is_active', true)
        .order('color_name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      throw new Error(`Failed to fetch active colors: ${error.message}`);
    }
  }

  async findByName(colorName) {
    try {
      const { data, error } = await supabaseConfig.getAdminClient()
        .from(this.tableName)
        .select('*')
        .ilike('color_name', colorName)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      throw new Error(`Failed to find color by name: ${error.message}`);
    }
  }
}

export default Color;
