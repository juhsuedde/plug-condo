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
      carregadores: {
        Row: {
          condominio_id: string
          created_at: string
          id: string
          localizacao: string
          nome: string
          potencia_kw: number
          status: Database["public"]["Enums"]["charger_status"]
        }
        Insert: {
          condominio_id: string
          created_at?: string
          id?: string
          localizacao: string
          nome: string
          potencia_kw?: number
          status?: Database["public"]["Enums"]["charger_status"]
        }
        Update: {
          condominio_id?: string
          created_at?: string
          id?: string
          localizacao?: string
          nome?: string
          potencia_kw?: number
          status?: Database["public"]["Enums"]["charger_status"]
        }
        Relationships: [
          {
            foreignKeyName: "carregadores_condominio_id_fkey"
            columns: ["condominio_id"]
            isOneToOne: false
            referencedRelation: "condominios"
            referencedColumns: ["id"]
          },
        ]
      }
      condominios: {
        Row: {
          cnpj: string | null
          created_at: string
          duracao_padrao_horas: number
          endereco: string
          horario_fim: string
          horario_inicio: string
          id: string
          limite_reservas_futuras: number
          nome: string
          preco_kwh: number
          qtd_unidades: number
          taxa_uso: number
        }
        Insert: {
          cnpj?: string | null
          created_at?: string
          duracao_padrao_horas?: number
          endereco: string
          horario_fim?: string
          horario_inicio?: string
          id?: string
          limite_reservas_futuras?: number
          nome: string
          preco_kwh?: number
          qtd_unidades?: number
          taxa_uso?: number
        }
        Update: {
          cnpj?: string | null
          created_at?: string
          duracao_padrao_horas?: number
          endereco?: string
          horario_fim?: string
          horario_inicio?: string
          id?: string
          limite_reservas_futuras?: number
          nome?: string
          preco_kwh?: number
          qtd_unidades?: number
          taxa_uso?: number
        }
        Relationships: []
      }
      fila_espera: {
        Row: {
          carregador_id: string
          created_at: string
          hora_entrada: string
          id: string
          notificado: boolean
          perfil_id: string
          posicao: number
        }
        Insert: {
          carregador_id: string
          created_at?: string
          hora_entrada?: string
          id?: string
          notificado?: boolean
          perfil_id: string
          posicao: number
        }
        Update: {
          carregador_id?: string
          created_at?: string
          hora_entrada?: string
          id?: string
          notificado?: boolean
          perfil_id?: string
          posicao?: number
        }
        Relationships: [
          {
            foreignKeyName: "fila_espera_carregador_id_fkey"
            columns: ["carregador_id"]
            isOneToOne: false
            referencedRelation: "carregadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fila_espera_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          carregador_id: string | null
          created_at: string
          expira_em: string | null
          id: string
          lida: boolean
          mensagem: string
          perfil_id: string
          tipo: string
          titulo: string
        }
        Insert: {
          carregador_id?: string | null
          created_at?: string
          expira_em?: string | null
          id?: string
          lida?: boolean
          mensagem: string
          perfil_id: string
          tipo?: string
          titulo: string
        }
        Update: {
          carregador_id?: string | null
          created_at?: string
          expira_em?: string | null
          id?: string
          lida?: boolean
          mensagem?: string
          perfil_id?: string
          tipo?: string
          titulo?: string
        }
        Relationships: []
      }
      perfis: {
        Row: {
          aprovado: boolean
          avatar_url: string | null
          condominio_id: string | null
          cpf: string | null
          created_at: string
          email: string
          id: string
          motivo_rejeicao: string | null
          nome: string
          role: Database["public"]["Enums"]["user_role"]
          status_aprovacao: Database["public"]["Enums"]["approval_status"]
          telefone: string | null
          unidade: string | null
          veiculo_marca: string | null
          veiculo_modelo: string | null
          veiculo_placa: string | null
        }
        Insert: {
          aprovado?: boolean
          avatar_url?: string | null
          condominio_id?: string | null
          cpf?: string | null
          created_at?: string
          email: string
          id: string
          motivo_rejeicao?: string | null
          nome: string
          role?: Database["public"]["Enums"]["user_role"]
          status_aprovacao?: Database["public"]["Enums"]["approval_status"]
          telefone?: string | null
          unidade?: string | null
          veiculo_marca?: string | null
          veiculo_modelo?: string | null
          veiculo_placa?: string | null
        }
        Update: {
          aprovado?: boolean
          avatar_url?: string | null
          condominio_id?: string | null
          cpf?: string | null
          created_at?: string
          email?: string
          id?: string
          motivo_rejeicao?: string | null
          nome?: string
          role?: Database["public"]["Enums"]["user_role"]
          status_aprovacao?: Database["public"]["Enums"]["approval_status"]
          telefone?: string | null
          unidade?: string | null
          veiculo_marca?: string | null
          veiculo_modelo?: string | null
          veiculo_placa?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "perfis_condominio_id_fkey"
            columns: ["condominio_id"]
            isOneToOne: false
            referencedRelation: "condominios"
            referencedColumns: ["id"]
          },
        ]
      }
      reservas: {
        Row: {
          carregador_id: string
          created_at: string
          custo_total: number | null
          data: string
          hora_fim: string
          hora_inicio: string
          id: string
          kwh_consumido: number | null
          perfil_id: string
          status: Database["public"]["Enums"]["reservation_status"]
        }
        Insert: {
          carregador_id: string
          created_at?: string
          custo_total?: number | null
          data: string
          hora_fim: string
          hora_inicio: string
          id?: string
          kwh_consumido?: number | null
          perfil_id: string
          status?: Database["public"]["Enums"]["reservation_status"]
        }
        Update: {
          carregador_id?: string
          created_at?: string
          custo_total?: number | null
          data?: string
          hora_fim?: string
          hora_inicio?: string
          id?: string
          kwh_consumido?: number | null
          perfil_id?: string
          status?: Database["public"]["Enums"]["reservation_status"]
        }
        Relationships: [
          {
            foreignKeyName: "reservas_carregador_id_fkey"
            columns: ["carregador_id"]
            isOneToOne: false
            referencedRelation: "carregadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservas_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
        ]
      }
      transacoes: {
        Row: {
          created_at: string
          id: string
          perfil_id: string
          pix_txid: string | null
          reserva_id: string | null
          status_pagamento: Database["public"]["Enums"]["payment_status"]
          valor_energia: number
          valor_taxa: number
          valor_total: number
        }
        Insert: {
          created_at?: string
          id?: string
          perfil_id: string
          pix_txid?: string | null
          reserva_id?: string | null
          status_pagamento?: Database["public"]["Enums"]["payment_status"]
          valor_energia?: number
          valor_taxa?: number
          valor_total: number
        }
        Update: {
          created_at?: string
          id?: string
          perfil_id?: string
          pix_txid?: string | null
          reserva_id?: string | null
          status_pagamento?: Database["public"]["Enums"]["payment_status"]
          valor_energia?: number
          valor_taxa?: number
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "transacoes_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transacoes_reserva_id_fkey"
            columns: ["reserva_id"]
            isOneToOne: false
            referencedRelation: "reservas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_my_condominio_id: { Args: never; Returns: string }
      get_my_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      invoke_edge_function: {
        Args: { fn_name: string; payload: Json }
        Returns: number
      }
      is_approved_morador: { Args: never; Returns: boolean }
    }
    Enums: {
      approval_status: "pendente" | "aprovado" | "rejeitado"
      charger_status: "disponivel" | "ocupado" | "manutencao"
      payment_status: "pendente" | "pago" | "reembolsado" | "cancelado"
      reservation_status: "agendada" | "ativa" | "concluida" | "cancelada"
      user_role: "morador" | "sindico"
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
      approval_status: ["pendente", "aprovado", "rejeitado"],
      charger_status: ["disponivel", "ocupado", "manutencao"],
      payment_status: ["pendente", "pago", "reembolsado", "cancelado"],
      reservation_status: ["agendada", "ativa", "concluida", "cancelada"],
      user_role: ["morador", "sindico"],
    },
  },
} as const
