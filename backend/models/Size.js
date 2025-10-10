// backend/models/Size.js
import createSupabaseConfig from '../../config/supabase.js';
import BaseModel from '../utils/BaseModel.js';
import constants from '../../config/constants.js';

const supabaseConfig = createSupabaseConfig();

class Size extends BaseModel {
  constructor() {
    super(constants.DATABASE_TABLES.SIZES || 'sizes', 'size_id');
    
    this.fillable = ['size_value', 'size_type', 'is_active'];

    this.validationRules = {
      size_value: {
        required: true,
        type: 'string',
        maxLength: 10
      },
      size_type: {
        required: false,
        type: 'string',
        maxLength: 20
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
        .order('size_value');

      if (error) throw error;
      return data || [];
    } catch (error) {
      throw new Error(`Failed to fetch active sizes: ${error.message}`);
    }
  }

  async findByType(sizeType = 'US') {
    try {
      const { data, error } = await supabaseConfig.getAdminClient()
        .from(this.tableName)
        .select('*')
        .eq('size_type', sizeType)
        .eq('is_active', true)
        .order('size_value');

      if (error) throw error;
      return data || [];
    } catch (error) {
      throw new Error(`Failed to fetch sizes by type: ${error.message}`);
    }
  }
}

export default Size;
