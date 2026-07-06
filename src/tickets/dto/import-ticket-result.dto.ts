export interface ImportTicketErrorDto {
  row: number;
  error: string;
}

export interface ImportTicketResultDto {
  created: number;
  failed: number;
  errors: ImportTicketErrorDto[];
}
