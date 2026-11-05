
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "appointments": {
                  Row: {
                    "created_at": string,"id": string,"patient_availability_json": Json | null,"patient_id": string,"referral_id": string,"slot_id": string,"status": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"patient_availability_json"?: Json | null,"patient_id": string,"referral_id": string,"slot_id": string,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"patient_availability_json"?: Json | null,"patient_id"?: string,"referral_id"?: string,"slot_id"?: string,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "appointments_patient_id_fkey"
      columns: ["patient_id"]
isOneToOne: false
      referencedRelation: "patients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "appointments_referral_id_fkey"
      columns: ["referral_id"]
isOneToOne: false
      referencedRelation: "referrals"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "appointments_slot_id_fkey"
      columns: ["slot_id"]
isOneToOne: false
      referencedRelation: "slots"
      referencedColumns: ["id"]
    }
                  ]
                },"case_events": {
                  Row: {
                    "at": string,"case_id": string,"id": number,"kind": string,"payload": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "at"?: string,"case_id": string,"id"?: never,"kind": string,"payload"?: NonNullable<Json>
                  }
                  Update: {
                    "at"?: string,"case_id"?: string,"id"?: never,"kind"?: string,"payload"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "case_events_case_id_fkey"
      columns: ["case_id"]
isOneToOne: false
      referencedRelation: "cases"
      referencedColumns: ["id"]
    }
                  ]
                },"cases": {
                  Row: {
                    "created_at": string,"id": string,"location_source": string | null,"patient_city": string | null,"patient_id": string,"patient_lat": number | null,"patient_lng": number | null,"patient_location": unknown,"route": string | null,"status": string,"summary_json": Json | null,"target_role": string | null,"updated_at": string,"urgency": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"location_source"?: string | null,"patient_city"?: string | null,"patient_id": string,"patient_lat"?: number | null,"patient_lng"?: number | null,"patient_location"?: unknown,"route"?: string | null,"status"?: string,"summary_json"?: Json | null,"target_role"?: string | null,"updated_at"?: string,"urgency"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"location_source"?: string | null,"patient_city"?: string | null,"patient_id"?: string,"patient_lat"?: number | null,"patient_lng"?: number | null,"patient_location"?: unknown,"route"?: string | null,"status"?: string,"summary_json"?: Json | null,"target_role"?: string | null,"updated_at"?: string,"urgency"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "cases_patient_id_fkey"
      columns: ["patient_id"]
isOneToOne: false
      referencedRelation: "patients"
      referencedColumns: ["id"]
    }
                  ]
                },"doctor_tokens": {
                  Row: {
                    "case_id": string,"created_at": string,"expires_at": string,"first_used_at": string | null,"practitioner_id": string | null,"token_hash": string
                  }
                  ComputedFields: never
                  Insert: {
                    "case_id": string,"created_at"?: string,"expires_at": string,"first_used_at"?: string | null,"practitioner_id"?: string | null,"token_hash": string
                  }
                  Update: {
                    "case_id"?: string,"created_at"?: string,"expires_at"?: string,"first_used_at"?: string | null,"practitioner_id"?: string | null,"token_hash"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "doctor_tokens_case_id_fkey"
      columns: ["case_id"]
isOneToOne: false
      referencedRelation: "cases"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "doctor_tokens_practitioner_id_fkey"
      columns: ["practitioner_id"]
isOneToOne: false
      referencedRelation: "practitioners"
      referencedColumns: ["id"]
    }
                  ]
                },"institution_hours": {
                  Row: {
                    "closes": string,"id": number,"institution_id": string,"is_on_call": boolean,"opens": string,"source": string,"weekday": number
                  }
                  ComputedFields: never
                  Insert: {
                    "closes": string,"id"?: never,"institution_id": string,"is_on_call"?: boolean,"opens": string,"source": string,"weekday": number
                  }
                  Update: {
                    "closes"?: string,"id"?: never,"institution_id"?: string,"is_on_call"?: boolean,"opens"?: string,"source"?: string,"weekday"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "institution_hours_institution_id_fkey"
      columns: ["institution_id"]
isOneToOne: false
      referencedRelation: "institutions"
      referencedColumns: ["id"]
    }
                  ]
                },"institution_services": {
                  Row: {
                    "institution_id": string,"source_dataset": string,"specialty_code": string,"units": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "institution_id": string,"source_dataset": string,"specialty_code": string,"units"?: number | null
                  }
                  Update: {
                    "institution_id"?: string,"source_dataset"?: string,"specialty_code"?: string,"units"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "institution_services_institution_id_fkey"
      columns: ["institution_id"]
isOneToOne: false
      referencedRelation: "institutions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "institution_services_specialty_code_fkey"
      columns: ["specialty_code"]
isOneToOne: false
      referencedRelation: "specialties"
      referencedColumns: ["code"]
    }
                  ]
                },"institutions": {
                  Row: {
                    "address": string | null,"city": string | null,"county": string | null,"email": string | null,"geo_precision": string | null,"geom": unknown,"hzzo_code": string | null,"id": string,"name": string,"osm_id": string | null,"phone": string | null,"postcode": string | null,"source_dataset": string,"type": string,"web": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string | null,"city"?: string | null,"county"?: string | null,"email"?: string | null,"geo_precision"?: string | null,"geom"?: unknown,"hzzo_code"?: string | null,"id": string,"name": string,"osm_id"?: string | null,"phone"?: string | null,"postcode"?: string | null,"source_dataset": string,"type": string,"web"?: string | null
                  }
                  Update: {
                    "address"?: string | null,"city"?: string | null,"county"?: string | null,"email"?: string | null,"geo_precision"?: string | null,"geom"?: unknown,"hzzo_code"?: string | null,"id"?: string,"name"?: string,"osm_id"?: string | null,"phone"?: string | null,"postcode"?: string | null,"source_dataset"?: string,"type"?: string,"web"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"messages": {
                  Row: {
                    "case_id": string,"content": string,"created_at": string,"id": number,"role": string
                  }
                  ComputedFields: never
                  Insert: {
                    "case_id": string,"content": string,"created_at"?: string,"id"?: never,"role": string
                  }
                  Update: {
                    "case_id"?: string,"content"?: string,"created_at"?: string,"id"?: never,"role"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "messages_case_id_fkey"
      columns: ["case_id"]
isOneToOne: false
      referencedRelation: "cases"
      referencedColumns: ["id"]
    }
                  ]
                },"notifications": {
                  Row: {
                    "action_state": string,"case_id": string | null,"created_at": string,"id": string,"kind": string,"patient_id": string,"payload": NonNullable<Json>,"read_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "action_state"?: string,"case_id"?: string | null,"created_at"?: string,"id"?: string,"kind": string,"patient_id": string,"payload"?: NonNullable<Json>,"read_at"?: string | null
                  }
                  Update: {
                    "action_state"?: string,"case_id"?: string | null,"created_at"?: string,"id"?: string,"kind"?: string,"patient_id"?: string,"payload"?: NonNullable<Json>,"read_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_case_id_fkey"
      columns: ["case_id"]
isOneToOne: false
      referencedRelation: "cases"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_patient_id_fkey"
      columns: ["patient_id"]
isOneToOne: false
      referencedRelation: "patients"
      referencedColumns: ["id"]
    }
                  ]
                },"patient_practitioners": {
                  Row: {
                    "patient_id": string,"practitioner_id": string,"role": string
                  }
                  ComputedFields: never
                  Insert: {
                    "patient_id": string,"practitioner_id": string,"role": string
                  }
                  Update: {
                    "patient_id"?: string,"practitioner_id"?: string,"role"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "patient_practitioners_patient_id_fkey"
      columns: ["patient_id"]
isOneToOne: false
      referencedRelation: "patients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "patient_practitioners_practitioner_id_fkey"
      columns: ["practitioner_id"]
isOneToOne: false
      referencedRelation: "practitioners"
      referencedColumns: ["id"]
    }
                  ]
                },"patients": {
                  Row: {
                    "birth_year": number,"email": string | null,"home_city": string,"home_geom": unknown,"id": string,"is_synthetic": boolean,"name": string,"note": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "birth_year": number,"email"?: string | null,"home_city": string,"home_geom"?: unknown,"id"?: string,"is_synthetic"?: boolean,"name": string,"note"?: string | null
                  }
                  Update: {
                    "birth_year"?: number,"email"?: string | null,"home_city"?: string,"home_geom"?: unknown,"id"?: string,"is_synthetic"?: boolean,"name"?: string,"note"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"practitioners": {
                  Row: {
                    "full_name": string,"id": string,"institution_id": string | null,"insured_count": number | null,"provider_name": string | null,"role": string,"source_dataset": string,"status": string | null,"team_code": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "full_name": string,"id": string,"institution_id"?: string | null,"insured_count"?: number | null,"provider_name"?: string | null,"role": string,"source_dataset": string,"status"?: string | null,"team_code"?: string | null
                  }
                  Update: {
                    "full_name"?: string,"id"?: string,"institution_id"?: string | null,"insured_count"?: number | null,"provider_name"?: string | null,"role"?: string,"source_dataset"?: string,"status"?: string | null,"team_code"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "practitioners_institution_id_fkey"
      columns: ["institution_id"]
isOneToOne: false
      referencedRelation: "institutions"
      referencedColumns: ["id"]
    }
                  ]
                },"rate_limits": {
                  Row: {
                    "hits": number,"key": string,"window_start": string
                  }
                  ComputedFields: never
                  Insert: {
                    "hits"?: number,"key": string,"window_start": string
                  }
                  Update: {
                    "hits"?: number,"key"?: string,"window_start"?: string
                  }
                  Relationships: [
                    
                  ]
                },"referrals": {
                  Row: {
                    "case_id": string,"document": string | null,"document_mime": string | null,"document_name": string | null,"extracted_json": Json | null,"id": string,"institution_id": string | null,"issued_at": string,"note": string | null,"practitioner_id": string | null,"priority": string,"specialty_code": string,"type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "case_id": string,"document"?: string | null,"document_mime"?: string | null,"document_name"?: string | null,"extracted_json"?: Json | null,"id"?: string,"institution_id"?: string | null,"issued_at"?: string,"note"?: string | null,"practitioner_id"?: string | null,"priority"?: string,"specialty_code": string,"type": string
                  }
                  Update: {
                    "case_id"?: string,"document"?: string | null,"document_mime"?: string | null,"document_name"?: string | null,"extracted_json"?: Json | null,"id"?: string,"institution_id"?: string | null,"issued_at"?: string,"note"?: string | null,"practitioner_id"?: string | null,"priority"?: string,"specialty_code"?: string,"type"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "referrals_case_id_fkey"
      columns: ["case_id"]
isOneToOne: false
      referencedRelation: "cases"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "referrals_institution_id_fkey"
      columns: ["institution_id"]
isOneToOne: false
      referencedRelation: "institutions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "referrals_practitioner_id_fkey"
      columns: ["practitioner_id"]
isOneToOne: false
      referencedRelation: "practitioners"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "referrals_specialty_code_fkey"
      columns: ["specialty_code"]
isOneToOne: false
      referencedRelation: "specialties"
      referencedColumns: ["code"]
    }
                  ]
                },"slots": {
                  Row: {
                    "ends_at": string,"held_until": string | null,"id": string,"institution_id": string,"specialty_code": string,"starts_at": string,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ends_at": string,"held_until"?: string | null,"id"?: string,"institution_id": string,"specialty_code": string,"starts_at": string,"status"?: string
                  }
                  Update: {
                    "ends_at"?: string,"held_until"?: string | null,"id"?: string,"institution_id"?: string,"specialty_code"?: string,"starts_at"?: string,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "slots_institution_id_fkey"
      columns: ["institution_id"]
isOneToOne: false
      referencedRelation: "institutions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "slots_specialty_code_fkey"
      columns: ["specialty_code"]
isOneToOne: false
      referencedRelation: "specialties"
      referencedColumns: ["code"]
    }
                  ]
                },"specialties": {
                  Row: {
                    "code": string,"hzzo_code": string | null,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"hzzo_code"?: string | null,"name": string
                  }
                  Update: {
                    "code"?: string,"hzzo_code"?: string | null,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "accept_slot_offer":
{ Args: { "p_notification_id": string }; Returns: {
              "created_at": string,
"id": string,
"patient_availability_json": Json | null,
"patient_id": string,
"referral_id": string,
"slot_id": string,
"status": string,
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "appointments"
        isOneToOne: true
        isSetofReturn: false
      } },
"cancel_appointment":
{ Args: { "p_appointment_id": string }; Returns: string
                           },
"city_point":
{ Args: { "p_city": string }; Returns: {
              "city": string,"lat": number,"lng": number,"n": number
            }[]
                           },
"confirm_appointment":
{ Args: { "p_appointment_id": string }; Returns: {
              "created_at": string,
"id": string,
"patient_availability_json": Json | null,
"patient_id": string,
"referral_id": string,
"slot_id": string,
"status": string,
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "appointments"
        isOneToOne: true
        isSetofReturn: false
      } },
"decline_slot_offer":
{ Args: { "p_notification_id": string }; Returns: string
                           },
"fold_hr":
{ Args: { "p": string }; Returns: string
                           },
"free_slot":
{ Args: { "p_slot_id": string }; Returns: string
                           },
"generate_demo_slots":
{ Args: { "p_days"?: number,"p_from"?: string }; Returns: number
                           },
"hit_rate_limit":
{ Args: { "p_key": string,"p_max": number,"p_window_seconds": number }; Returns: boolean
                           },
"institution_card":
{ Args: { "p_at"?: string,"p_institution_id": string }; Returns: Json
                           },
"nearest_institutions":
{ Args: { "p_at"?: string,"p_lat": number,"p_limit"?: number,"p_lng": number,"p_open_now"?: boolean,"p_specialty": string }; Returns: {
              "address": string,"city": string,"closes_at": string,"distance_km": number,"geo_precision": string,"has_hours": boolean,"id": string,"is_on_call": boolean,"lat": number,"lng": number,"name": string,"open_now": boolean,"phone": string,"source_dataset": string,"type": string,"web": string
            }[]
                           },
"offer_freed_slot":
{ Args: { "p_slot_id": string }; Returns: string
                           },
"offer_reschedule":
{ Args: { "p_appointment_id": string,"p_slot_id": string }; Returns: string
                           },
"open_status":
{ Args: { "p_at"?: string,"p_institution_id": string }; Returns: {
              "closes_at": string,"has_hours": boolean,"is_on_call": boolean,"open_now": boolean
            }[]
                           },
"patient_profile":
{ Args: { "p_patient_id": string }; Returns: Json
                           },
"propose_appointment":
{ Args: { "p_referral_id": string }; Returns: {
              "created_at": string,
"id": string,
"patient_availability_json": Json | null,
"patient_id": string,
"referral_id": string,
"slot_id": string,
"status": string,
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "appointments"
        isOneToOne: true
        isSetofReturn: false
      } },
"release_expired_holds":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"request_reschedule":
{ Args: { "p_appointment_id": string,"p_availability": Json }; Returns: {
              "created_at": string,
"id": string,
"patient_availability_json": Json | null,
"patient_id": string,
"referral_id": string,
"slot_id": string,
"status": string,
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "appointments"
        isOneToOne: true
        isSetofReturn: false
      } },
"search_practitioners":
{ Args: { "p_limit"?: number,"p_query": string,"p_role": string }; Returns: {
              "address": string,"city": string,"full_name": string,"id": string,"institution_name": string,"provider_name": string,"role": string
            }[]
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
