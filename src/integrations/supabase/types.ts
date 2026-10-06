export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      ativos: {
        Row: {
          grupo_override: string | null
          m: number
          observacao: string | null
          patrimonio: string | null
          subgrupo: string | null
        }
        Insert: {
          grupo_override?: string | null
          m: number
          observacao?: string | null
          patrimonio?: string | null
          subgrupo?: string | null
        }
        Update: {
          grupo_override?: string | null
          m?: number
          observacao?: string | null
          patrimonio?: string | null
          subgrupo?: string | null
        }
        Relationships: []
      }
      classificacao_subgrupo: {
        Row: {
          categoria: string
          observacao: string | null
          subcategoria: string
          subgrupo: string
          unidade: string
        }
        Insert: {
          categoria: string
          observacao?: string | null
          subcategoria: string
          subgrupo: string
          unidade?: string
        }
        Update: {
          categoria?: string
          observacao?: string | null
          subcategoria?: string
          subgrupo?: string
          unidade?: string
        }
        Relationships: []
      }
      contas_pessoal: {
        Row: {
          conta: string
        }
        Insert: {
          conta: string
        }
        Update: {
          conta?: string
        }
        Relationships: []
      }
      importacoes: {
        Row: {
          arquivo: string | null
          criado_em: string
          criado_por: string | null
          id: string
          linhas: number | null
          meses: string[] | null
        }
        Insert: {
          arquivo?: string | null
          criado_em?: string
          criado_por?: string | null
          id?: string
          linhas?: number | null
          meses?: string[] | null
        }
        Update: {
          arquivo?: string | null
          criado_em?: string
          criado_por?: string | null
          id?: string
          linhas?: number | null
          meses?: string[] | null
        }
        Relationships: []
      }
      lancamentos: {
        Row: {
          conta: string | null
          custo_combustivel: number
          depreciacao: number
          despesa: string | null
          despesa_pai: string | null
          empresa: string
          fazenda: string | null
          id: number
          importacao_id: string | null
          km_hr: number
          litros: number
          m: number
          mes: string
          motorista: string | null
          patrimonio: string | null
          produto: string | null
          qtde: number
          salario: number
          subgrupo: string | null
          valor_total: number
        }
        Insert: {
          conta?: string | null
          custo_combustivel?: number
          depreciacao?: number
          despesa?: string | null
          despesa_pai?: string | null
          empresa: string
          fazenda?: string | null
          id?: never
          importacao_id?: string | null
          km_hr?: number
          litros?: number
          m: number
          mes: string
          motorista?: string | null
          patrimonio?: string | null
          produto?: string | null
          qtde?: number
          salario?: number
          subgrupo?: string | null
          valor_total?: number
        }
        Update: {
          conta?: string | null
          custo_combustivel?: number
          depreciacao?: number
          despesa?: string | null
          despesa_pai?: string | null
          empresa?: string
          fazenda?: string | null
          id?: never
          importacao_id?: string | null
          km_hr?: number
          litros?: number
          m?: number
          mes?: string
          motorista?: string | null
          patrimonio?: string | null
          produto?: string | null
          qtde?: number
          salario?: number
          subgrupo?: string | null
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "lancamentos_importacao_id_fkey"
            columns: ["importacao_id"]
            isOneToOne: false
            referencedRelation: "importacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      mapa_manutencao: {
        Row: {
          classe: string
          despesa: string
        }
        Insert: {
          classe: string
          despesa: string
        }
        Update: {
          classe?: string
          despesa?: string
        }
        Relationships: []
      }
      parametros: {
        Row: {
          chave: string
          descricao: string | null
          valor: string
        }
        Insert: {
          chave: string
          descricao?: string | null
          valor: string
        }
        Update: {
          chave?: string
          descricao?: string | null
          valor?: string
        }
        Relationships: []
      }
      semirreboques: {
        Row: {
          m: number
        }
        Insert: {
          m: number
        }
        Update: {
          m?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      v_despesas_a_classificar: {
        Row: {
          despesa: string | null
          linhas: number | null
          valor: number | null
        }
        Relationships: []
      }
      v_lancamentos: {
        Row: {
          categoria: string | null
          classe_manutencao: string | null
          combustivel: number | null
          conta: string | null
          custo_total: number | null
          depreciacao: number | null
          despesa: string | null
          despesa_pai: string | null
          empresa: string | null
          fazenda: string | null
          grupo: string | null
          id: number | null
          km_hr: number | null
          litros: number | null
          m: number | null
          manutencao: number | null
          mes: string | null
          motorista: string | null
          patrimonio: string | null
          pessoal_em_manut: number | null
          produto: string | null
          qtde: number | null
          salario: number | null
          subcategoria: string | null
          subgrupo: string | null
          unidade: string | null
        }
        Relationships: []
      }
      v_mensal_ativo: {
        Row: {
          categoria: string | null
          combustivel: number | null
          custo_total: number | null
          depreciacao: number | null
          empresa: string | null
          grupo: string | null
          km_hr: number | null
          litros: number | null
          m: number | null
          manutencao: number | null
          mes: string | null
          patrimonio: string | null
          salario: number | null
          subcategoria: string | null
          subgrupo: string | null
          unidade: string | null
        }
        Relationships: []
      }
      v_mensal_manut_classe: {
        Row: {
          classe: string | null
          empresa: string | null
          grupo: string | null
          m: number | null
          manutencao: number | null
          mes: string | null
          pessoal: number | null
          subcategoria: string | null
        }
        Relationships: []
      }
      v_subgrupos_nao_classificados: {
        Row: {
          ativos: number | null
          subgrupo: string | null
          valor: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "viewer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "viewer"],
    },
  },
} as const
