<?php
session_start();
require_once "db.php";

if (!isset($_SESSION['user_id'])) {
    header("Location: login.php");
    exit;
}

$user_id = $_SESSION['user_id'];
$username = $_SESSION['name'];
$message = "";

// Crear Post
if (isset($_POST['create_post'])) {
    $title = $_POST['title'];
    $desc = $_POST['description'];
    pg_query_params($db_connection,
                    "INSERT INTO posts (title, description, user_id, fecha) VALUES ($1,$2,$3,NOW())",
                    [$title, $desc, $user_id]);
    $message = "Post creado correctamente.";
}

// Eliminar Post (solo propio)
if (isset($_GET['delete_post'])) {
    $id = $_GET['delete_post'];
    pg_query_params($db_connection, "DELETE FROM posts WHERE idpost=$1 AND user_id=$2", [$id, $user_id]);
    $message = "Post eliminado correctamente.";
}

// Crear Comentario
if (isset($_POST['create_comment'])) {
    $comment_desc = $_POST['comment'];
    $post_id = $_POST['post_id'];
    pg_query_params($db_connection,
                    "INSERT INTO comments (description, idpost, user_id, fecha) VALUES ($1, $2, $3, NOW())",
                    [$comment_desc, $post_id, $user_id]);
    $message = "Comentario agregado.";
}

// Eliminar Comentario (solo propio)
if (isset($_GET['delete_comment'])) {
    $comment_id = $_GET['delete_comment'];
    pg_query_params($db_connection, "DELETE FROM comments WHERE idcomment=$1 AND user_id=$2", [$comment_id, $user_id]);
    $message = "Comentario eliminado.";
}

// Leer Posts
$posts_query = "SELECT p.idpost, p.title, p.description, p.fecha, u.name
FROM posts p JOIN users u ON p.user_id = u.iduser
ORDER BY p.fecha DESC";
$posts_result = pg_query($db_connection, $posts_query);
?>

<!DOCTYPE html>
<html>
<head>
<title>Panel de Posts y Comentarios</title>
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="container mt-5">

<h2>Panel de Posts - <?= htmlspecialchars($username) ?></h2>
<a href="logout.php" class="btn btn-danger mb-3">Cerrar sesión</a>

<?php if($message) echo "<div class='alert alert-info'>$message</div>"; ?>

<!-- Formulario Crear Post -->
<form method="POST" class="mb-4">
<h4>Crear Nuevo Post</h4>
<div class="mb-3">
<input type="text" name="title" class="form-control" placeholder="Título" required>
</div>
<div class="mb-3">
<textarea name="description" class="form-control" placeholder="Descripción" required></textarea>
</div>
<button name="create_post" class="btn btn-primary">Crear Post</button>
</form>

<!-- Lista de Posts -->
<?php while ($post = pg_fetch_assoc($posts_result)) { ?>
    <div class="card mb-4">
    <div class="card-header">
    <strong><?= htmlspecialchars($post['title']) ?></strong> por <?= htmlspecialchars($post['name']) ?> - <?= $post['fecha'] ?>
    <?php if($post['name'] === $username) { ?>
        <a href="?delete_post=<?= $post['idpost'] ?>" class="btn btn-sm btn-danger float-end">Eliminar</a>
        <?php } ?>
        </div>
        <div class="card-body">
        <p><?= htmlspecialchars($post['description']) ?></p>

        <!-- Formulario Comentario -->
        <form method="POST" class="mb-3">
        <input type="hidden" name="post_id" value="<?= $post['idpost'] ?>">
        <div class="input-group">
        <input type="text" name="comment" class="form-control" placeholder="Escribe un comentario..." required>
        <button name="create_comment" class="btn btn-secondary">Comentar</button>
        </div>
        </form>

        <!-- Listar Comentarios -->
        <?php
        $comments_query = "SELECT c.*, u.name as username FROM comments c JOIN users u ON c.user_id = u.iduser WHERE idpost=$1 ORDER BY fecha ASC";
        $comments_res = pg_query_params($db_connection, $comments_query, [$post['idpost']]);
        while($comment = pg_fetch_assoc($comments_res)) {
            echo "<div class='border p-2 mb-1'>";
            echo "<strong>".htmlspecialchars($comment['username']).":</strong> ".htmlspecialchars($comment['description']);
            // Botón eliminar solo si es autor
            if ($comment['user_id'] == $user_id) {
                echo " <a href='?delete_comment={$comment['idcomment']}' class='btn btn-sm btn-danger'>Eliminar</a>";
            }
            echo "</div>";
        }
        ?>
        </div>
        </div>
        <?php } ?>

        </body>
        </html>
