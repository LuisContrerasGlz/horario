declare module 'express-session' {
  interface SessionData {
    activeSemesterId?: number;
    user?: {
      id_usuario: number;
      nombre: string;
      correo_electronico: string;
      tipo_usuario: number;
      id_ct: number | null;
      cct_codigo?: string | null;
      cct_nombre?: string | null;
    };
  }
}

export {};
