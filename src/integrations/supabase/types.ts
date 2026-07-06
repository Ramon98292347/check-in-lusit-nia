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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      acomodacoes: {
        Row: {
          ativo: boolean | null
          atualizado_em: string | null
          capacidade_adultos: number | null
          capacidade_criancas: number | null
          criado_em: string | null
          descricao: string | null
          id: string
          nome: string
          status: string | null
          tipo: string | null
          valor_diaria: number | null
        }
        Insert: {
          ativo?: boolean | null
          atualizado_em?: string | null
          capacidade_adultos?: number | null
          capacidade_criancas?: number | null
          criado_em?: string | null
          descricao?: string | null
          id?: string
          nome: string
          status?: string | null
          tipo?: string | null
          valor_diaria?: number | null
        }
        Update: {
          ativo?: boolean | null
          atualizado_em?: string | null
          capacidade_adultos?: number | null
          capacidade_criancas?: number | null
          criado_em?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          status?: string | null
          tipo?: string | null
          valor_diaria?: number | null
        }
        Relationships: []
      }
      acompanhantes: {
        Row: {
          atualizado_em: string | null
          cpf: string | null
          criado_em: string | null
          hospedagem_id: string | null
          id: string
          nascimento: string | null
          nome: string | null
        }
        Insert: {
          atualizado_em?: string | null
          cpf?: string | null
          criado_em?: string | null
          hospedagem_id?: string | null
          id?: string
          nascimento?: string | null
          nome?: string | null
        }
        Update: {
          atualizado_em?: string | null
          cpf?: string | null
          criado_em?: string | null
          hospedagem_id?: string | null
          id?: string
          nascimento?: string | null
          nome?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "acompanhantes_hospedagem_id_fkey"
            columns: ["hospedagem_id"]
            isOneToOne: false
            referencedRelation: "hospedagens"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracoes_sistema: {
        Row: {
          atualizado_em: string | null
          chave: string
          criado_em: string | null
          descricao: string | null
          id: string
          valor: string | null
        }
        Insert: {
          atualizado_em?: string | null
          chave: string
          criado_em?: string | null
          descricao?: string | null
          id?: string
          valor?: string | null
        }
        Update: {
          atualizado_em?: string | null
          chave?: string
          criado_em?: string | null
          descricao?: string | null
          id?: string
          valor?: string | null
        }
        Relationships: []
      }
      documentos_gerados: {
        Row: {
          canal: string | null
          criado_em: string | null
          enviado_em: string | null
          hospedagem_id: string | null
          id: string
          payload: Json | null
          resposta_webhook: Json | null
          status: string | null
          tipo_documento: string | null
        }
        Insert: {
          canal?: string | null
          criado_em?: string | null
          enviado_em?: string | null
          hospedagem_id?: string | null
          id?: string
          payload?: Json | null
          resposta_webhook?: Json | null
          status?: string | null
          tipo_documento?: string | null
        }
        Update: {
          canal?: string | null
          criado_em?: string | null
          enviado_em?: string | null
          hospedagem_id?: string | null
          id?: string
          payload?: Json | null
          resposta_webhook?: Json | null
          status?: string | null
          tipo_documento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documentos_gerados_hospedagem_id_fkey"
            columns: ["hospedagem_id"]
            isOneToOne: false
            referencedRelation: "hospedagens"
            referencedColumns: ["id"]
          },
        ]
      }
      hospedagens: {
        Row: {
          acomodacao_id: string | null
          adultos: number | null
          atualizado_em: string | null
          checkin: string
          checkout: string
          criado_em: string | null
          criancas: number | null
          desconto: number | null
          impresso_em: string | null
          hospede_id: string | null
          id: string
          nf: string | null
          observacoes: string | null
          origem: string | null
          qtd_diarias: number | null
          saldo: number | null
          status_impressao: string | null
          status: string | null
          valor_consumo: number | null
          valor_danos: number | null
          valor_diaria: number | null
          valor_hospedagem: number | null
          valor_pago: number | null
          valor_total: number | null
        }
        Insert: {
          acomodacao_id?: string | null
          adultos?: number | null
          atualizado_em?: string | null
          checkin: string
          checkout: string
          criado_em?: string | null
          criancas?: number | null
          desconto?: number | null
          impresso_em?: string | null
          hospede_id?: string | null
          id?: string
          nf?: string | null
          observacoes?: string | null
          origem?: string | null
          qtd_diarias?: number | null
          saldo?: number | null
          status_impressao?: string | null
          status?: string | null
          valor_consumo?: number | null
          valor_danos?: number | null
          valor_diaria?: number | null
          valor_hospedagem?: number | null
          valor_pago?: number | null
          valor_total?: number | null
        }
        Update: {
          acomodacao_id?: string | null
          adultos?: number | null
          atualizado_em?: string | null
          checkin?: string
          checkout?: string
          criado_em?: string | null
          criancas?: number | null
          desconto?: number | null
          impresso_em?: string | null
          hospede_id?: string | null
          id?: string
          nf?: string | null
          observacoes?: string | null
          origem?: string | null
          qtd_diarias?: number | null
          saldo?: number | null
          status_impressao?: string | null
          status?: string | null
          valor_consumo?: number | null
          valor_danos?: number | null
          valor_diaria?: number | null
          valor_hospedagem?: number | null
          valor_pago?: number | null
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "hospedagens_acomodacao_id_fkey"
            columns: ["acomodacao_id"]
            isOneToOne: false
            referencedRelation: "acomodacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospedagens_hospede_id_fkey"
            columns: ["hospede_id"]
            isOneToOne: false
            referencedRelation: "hospedes"
            referencedColumns: ["id"]
          },
        ]
      }
      hospedes: {
        Row: {
          atualizado_em: string | null
          cep: string | null
          cidade: string | null
          cpf: string | null
          criado_em: string | null
          email: string | null
          endereco: string | null
          id: string
          nascimento: string | null
          nome: string
          placa_veiculo: string | null
          telefone: string | null
          uf: string | null
        }
        Insert: {
          atualizado_em?: string | null
          cep?: string | null
          cidade?: string | null
          cpf?: string | null
          criado_em?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          nascimento?: string | null
          nome: string
          placa_veiculo?: string | null
          telefone?: string | null
          uf?: string | null
        }
        Update: {
          atualizado_em?: string | null
          cep?: string | null
          cidade?: string | null
          cpf?: string | null
          criado_em?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          nascimento?: string | null
          nome?: string
          placa_veiculo?: string | null
          telefone?: string | null
          uf?: string | null
        }
        Relationships: []
      }
      itens_vistoria: {
        Row: {
          criado_em: string | null
          hospedagem_id: string | null
          id: string
          nome_produto: string | null
          produto_id: string | null
          quantidade: number | null
          valor_total: number | null
          valor_unitario: number | null
          vistoria_id: string | null
        }
        Insert: {
          criado_em?: string | null
          hospedagem_id?: string | null
          id?: string
          nome_produto?: string | null
          produto_id?: string | null
          quantidade?: number | null
          valor_total?: number | null
          valor_unitario?: number | null
          vistoria_id?: string | null
        }
        Update: {
          criado_em?: string | null
          hospedagem_id?: string | null
          id?: string
          nome_produto?: string | null
          produto_id?: string | null
          quantidade?: number | null
          valor_total?: number | null
          valor_unitario?: number | null
          vistoria_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "itens_vistoria_hospedagem_id_fkey"
            columns: ["hospedagem_id"]
            isOneToOne: false
            referencedRelation: "hospedagens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_vistoria_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos_consumo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_vistoria_vistoria_id_fkey"
            columns: ["vistoria_id"]
            isOneToOne: false
            referencedRelation: "vistorias"
            referencedColumns: ["id"]
          },
        ]
      }
      pagamentos: {
        Row: {
          criado_em: string | null
          forma_pagamento: string | null
          hospedagem_id: string | null
          id: string
          observacao: string | null
          pago_em: string | null
          valor: number | null
        }
        Insert: {
          criado_em?: string | null
          forma_pagamento?: string | null
          hospedagem_id?: string | null
          id?: string
          observacao?: string | null
          pago_em?: string | null
          valor?: number | null
        }
        Update: {
          criado_em?: string | null
          forma_pagamento?: string | null
          hospedagem_id?: string | null
          id?: string
          observacao?: string | null
          pago_em?: string | null
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pagamentos_hospedagem_id_fkey"
            columns: ["hospedagem_id"]
            isOneToOne: false
            referencedRelation: "hospedagens"
            referencedColumns: ["id"]
          },
        ]
      }
      perfis: {
        Row: {
          ativo: boolean | null
          atualizado_em: string | null
          criado_em: string | null
          email: string | null
          id: string
          nome: string | null
        }
        Insert: {
          ativo?: boolean | null
          atualizado_em?: string | null
          criado_em?: string | null
          email?: string | null
          id: string
          nome?: string | null
        }
        Update: {
          ativo?: boolean | null
          atualizado_em?: string | null
          criado_em?: string | null
          email?: string | null
          id?: string
          nome?: string | null
        }
        Relationships: []
      }
      produtos_consumo: {
        Row: {
          ativo: boolean | null
          atualizado_em: string | null
          categoria: string | null
          criado_em: string | null
          id: string
          nome: string
          valor_unitario: number | null
        }
        Insert: {
          ativo?: boolean | null
          atualizado_em?: string | null
          categoria?: string | null
          criado_em?: string | null
          id?: string
          nome: string
          valor_unitario?: number | null
        }
        Update: {
          ativo?: boolean | null
          atualizado_em?: string | null
          categoria?: string | null
          criado_em?: string | null
          id?: string
          nome?: string
          valor_unitario?: number | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          criado_em: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          criado_em?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          criado_em?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      usuarios_internos: {
        Row: {
          ativo: boolean | null
          atualizado_em: string | null
          criado_em: string | null
          id: string
          nome: string
          role: Database["public"]["Enums"]["app_role"]
          senha_hash: string
          username: string
        }
        Insert: {
          ativo?: boolean | null
          atualizado_em?: string | null
          criado_em?: string | null
          id?: string
          nome: string
          role: Database["public"]["Enums"]["app_role"]
          senha_hash: string
          username: string
        }
        Update: {
          ativo?: boolean | null
          atualizado_em?: string | null
          criado_em?: string | null
          id?: string
          nome?: string
          role?: Database["public"]["Enums"]["app_role"]
          senha_hash?: string
          username?: string
        }
        Relationships: []
      }
      vistorias: {
        Row: {
          acomodacao_id: string | null
          atualizado_em: string | null
          criado_em: string | null
          descricao_dano: string | null
          funcionario_id: string | null
          hospedagem_id: string | null
          houve_consumo: boolean | null
          houve_dano: boolean | null
          id: string
          observacoes: string | null
          quarto_vistoriado: boolean | null
          status: string | null
          valor_dano: number | null
          valor_total_consumo: number | null
        }
        Insert: {
          acomodacao_id?: string | null
          atualizado_em?: string | null
          criado_em?: string | null
          descricao_dano?: string | null
          funcionario_id?: string | null
          hospedagem_id?: string | null
          houve_consumo?: boolean | null
          houve_dano?: boolean | null
          id?: string
          observacoes?: string | null
          quarto_vistoriado?: boolean | null
          status?: string | null
          valor_dano?: number | null
          valor_total_consumo?: number | null
        }
        Update: {
          acomodacao_id?: string | null
          atualizado_em?: string | null
          criado_em?: string | null
          descricao_dano?: string | null
          funcionario_id?: string | null
          hospedagem_id?: string | null
          houve_consumo?: boolean | null
          houve_dano?: boolean | null
          id?: string
          observacoes?: string | null
          quarto_vistoriado?: boolean | null
          status?: string | null
          valor_dano?: number | null
          valor_total_consumo?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vistorias_acomodacao_id_fkey"
            columns: ["acomodacao_id"]
            isOneToOne: false
            referencedRelation: "acomodacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vistorias_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vistorias_hospedagem_id_fkey"
            columns: ["hospedagem_id"]
            isOneToOne: false
            referencedRelation: "hospedagens"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      validar_login_interno: {
        Args: {
          p_password: string
          p_username: string
        }
        Returns: {
          id: string
          nome: string
          role: Database["public"]["Enums"]["app_role"]
          username: string
        }[]
      }
    }
    Enums: {
      app_role: "administrador" | "funcionario"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      app_role: ["administrador", "funcionario"],
    },
  },
} as const
