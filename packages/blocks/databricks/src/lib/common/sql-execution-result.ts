export type DatabricksSqlExecutionResult = {
  statement_id: string;
  status: {
    state: 'SUCCEEDED' | 'FAILED' | 'CANCELED' | 'PENDING' | 'RUNNING';
  };
  manifest: {
    format: string;
    total_byte_count: number;
    total_chunk_count: number;
    total_row_count: number;
    schema: {
      column_count: number;
      columns: {
        name: string;
        position: number;
        type_name: string;
        type_text: string;
      }[];
    };
    chunks: {
      chunk_index: number;
      row_count: number;
      row_offset: number;
    }[];
  };
  result: {
    external_links: {
      chunk_index: number;
      row_count: number;
      row_offset: number;
      byte_count: number;
      expiration: string;
      external_link: string;
    }[];
  };
};
