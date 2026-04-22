<?php
session_start();
require_once "db.php";

// Simulamos un usuario logueado
$_SESSION['user_id'] = 1;  // Luis
$_SESSION['name'] = 'Luis - SysAdmin';
$user_id = $_SESSION['user_id'];

// ID del post donde agregaremos comentario (usa un post existente)
$post_id = 1;

// Insertar un comentario de prueba
if (isset($_GET['add'])) {
    $comment_text = "Comentario de prueba " . date("H:i:s");
    $query = "INSERT INTO comments (description, idpost, user_id, fecha) VALUES ($1,$2,$3,NOW())";
    pg_query_params($db_connection, $query, [$comment_text, $post_id, $user_id]);
    echo "Comentario agregado: $comment_text<br>";
}

// Listar comentarios
echo "<h2>Comentarios del Post ID $post_id</h2>";
$query = "SELECT c.idcomment, c.description, c.fecha, u.name AS username
FROM comments c
JOIN users u ON c.user_id = u.iduser
WHERE c.idpost=$1
ORDER BY c.fecha ASC";
$res = pg_query_params($db_connection, $query, [$post_id]);

while ($row = pg_fetch_assoc($res)) {
    echo "<div>";
    echo "<strong>".htmlspecialchars($row['username'])."</strong>: " . htmlspecialchars($row['description']);
    echo " <small>[" . $row['fecha'] . "]</small>";
    echo "</div>";
}

echo "<br><a href='?add=1'>Agregar comentario de prueba</a>";
