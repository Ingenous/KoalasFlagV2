-- Koalas Flag Football: esquema de la base de datos
-- En Hostinger la base ya existe con otro nombre: borra las dos líneas
-- siguientes (CREATE DATABASE y USE) antes de importar este archivo.
CREATE DATABASE IF NOT EXISTS koalas_flag CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE koalas_flag;

CREATE TABLE IF NOT EXISTS usuarios (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario       VARCHAR(50)  NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  creado_en     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_usuarios_usuario (usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS imagenes (
  id        INT UNSIGNED NOT NULL AUTO_INCREMENT,
  seccion   ENUM('gallery','highlight','player') NOT NULL,
  titulo    VARCHAR(80)  NOT NULL DEFAULT '',
  posicion  VARCHAR(30)  NOT NULL DEFAULT '',
  numero    VARCHAR(3)   NOT NULL DEFAULT '',
  link      VARCHAR(500) NOT NULL DEFAULT '',
  archivo   VARCHAR(100) NOT NULL,
  creado_en TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_imagenes_seccion (seccion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Próximo partido y estadísticas que se editan desde el panel
CREATE TABLE IF NOT EXISTS info_sitio (
  clave VARCHAR(20) NOT NULL,
  valor VARCHAR(40) NOT NULL DEFAULT '',
  PRIMARY KEY (clave)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- La tabla "sessions" la crea el servidor por sí solo al arrancar.
