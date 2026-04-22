-- Creación de tabla de usuarios
CREATE TABLE users (
    iduser SERIAL PRIMARY KEY,
    email VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(100),
    habilitado BIT(1),
    password VARCHAR(255)
);

-- Creación de tabla de posts
CREATE TABLE posts (
    idpost SERIAL PRIMARY KEY,
    title VARCHAR(200),
    description TEXT,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id INTEGER REFERENCES users (iduser) ON DELETE CASCADE
);

-- Creación de tabla de comentarios
CREATE TABLE comments (
    idcomment SERIAL PRIMARY KEY,
    description TEXT,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    idpost INTEGER REFERENCES posts (idpost) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users (iduser) ON DELETE CASCADE NOT NULL
);

-- Datos de prueba

INSERT INTO
    users (
        email,
        name,
        habilitado,
        password
    )
VALUES (
        'luis@uac.edu.pe',
        'Luis - SysAdmin',
        B'1',
        '12345'
    ),
    (
        'ana@uac.edu.pe',
        'Ana - Developer',
        B'1',
        'pass123'
    ),
    (
        'mario@uac.edu.pe',
        'Mario - QA',
        B'1',
        'qwerty'
    );

INSERT INTO
    posts (title, description, user_id)
VALUES (
        'Despliegue Exitoso',
        'Servicio NGINX conectado a Postgres en Fedora 43',
        1
    ),
    (
        'Primer Post',
        'Post de prueba de Ana',
        2
    ),
    (
        'QA Report',
        'Reporte de prueba de Mario',
        3
    );

INSERT INTO
    comments (description, idpost, user_id)
VALUES ('Excelente despliegue!', 1, 1),
    ('Muy bien hecho!', 1, 1),
    ('Se requiere revisión', 3, 3);