
const http = require("http");
const fs = require("fs");
const path = require("path");

let books = [];
const server = http.createServer((req, res) => {
    let url = new URL(req.url, "http://localhost");
    let id = decodeURIComponent(url.pathname.split("/")[2] || "");
    if (req.method === "GET" && url.pathname !== "/books") {

        let file = url.pathname === "/"
            ? "practical.html"
            : path.basename(url.pathname);

        let types = {
            ".html": "text/html",
            ".css": "text/css",
            ".js": "text/javascript"
        };

        fs.readFile(path.join(__dirname, file), (err, data) => {
            if (err) {
                res.writeHead(404);
                return res.end("File Not Found");
            }

            res.writeHead(200, {
                "Content-Type": types[path.extname(file)]
            });
            res.end(data);
        });

        return;
    }

    let data = "";

    req.on("data", chunk => data += chunk);

    req.on("end", () => {

        let form = new URLSearchParams(data);
        if (req.method === "POST" && url.pathname === "/books") {

            let book = {
                id: form.get("id"),
                title: form.get("title"),
                author: form.get("author"),
                category: form.get("category")
            };

            if (!book.id || !book.title || !book.author || !book.category)
                return res.end("Fill all fields");

            if (books.some(b => b.id === book.id))
                return res.end("ID Already Exists");

            books.push(book);
            return res.end("Book Added Successfully");
        }
        if (req.method === "GET" && url.pathname === "/books") {

            let result = books.map(b =>
                [b.id, b.title, b.author, b.category]
                .map(encodeURIComponent).join("|")
            ).join("\n");

            return res.end(result);
        }
        if (req.method === "PUT" && id) {

            let b = books.find(b => b.id === id);

            if (!b) return res.end("Book Not Found");

            b.title = form.get("title") || b.title;
            b.author = form.get("author") || b.author;
            b.category = form.get("category") || b.category;

            return res.end("Book Updated Successfully");
        }
        if (req.method === "DELETE" && id) {

            let index = books.findIndex(b => b.id === id);

            if (index === -1) return res.end("Book Not Found");

            books.splice(index, 1);
            return res.end("Book Deleted Successfully");
        }

        res.writeHead(404);
        res.end("Invalid Request");
    });
});

server.listen(3000, () => {
    console.log("Server running at http://localhost:3000");
});

let booksList = [];
let editId = null;
async function displayBooks() {

    let response = await fetch("/books");
    let data = await response.text();

    booksList = data ? data.split("\n").map(line => {
        let [id, title, author, category] =
            line.split("|").map(decodeURIComponent);

        return {id, title, author, category};
    }) : [];

    let list = document.getElementById("bookList");
    let search = document.getElementById("search").value.toLowerCase();

    list.innerHTML = "";

    booksList.forEach(b => {

        if ((b.id + b.title + b.author + b.category)
            .toLowerCase().includes(search)) {

            let row = list.insertRow();

            [b.id, b.title, b.author, b.category].forEach(value => {
                row.insertCell().textContent = value;
            });

            let cell = row.insertCell();

            let edit = document.createElement("button");
            edit.textContent = "Edit";
            edit.onclick = () => editBook(b.id);

            let del = document.createElement("button");
            del.textContent = "Delete";
            del.onclick = () => deleteBook(b.id);

            cell.append(edit, del);
        }
    });
}
async function addBook() {

    let book = {
        id: document.getElementById("id").value.trim(),
        title: document.getElementById("title").value.trim(),
        author: document.getElementById("author").value.trim(),
        category: document.getElementById("category").value.trim()
    };

    if (Object.values(book).some(v => !v)) {
        alert("Fill all fields!");
        return;
    }

    let response = await fetch(
        editId ? "/books/" + encodeURIComponent(editId) : "/books",
        {
            method: editId ? "PUT" : "POST",
            headers: {"Content-Type": "application/x-www-form-urlencoded"},
            body: new URLSearchParams(book)
        }
    );

    alert(await response.text());
    clearForm();
    displayBooks();
}
function editBook(id) {

    let b = booksList.find(b => b.id === id);

    document.getElementById("id").value = b.id;
    document.getElementById("title").value = b.title;
    document.getElementById("author").value = b.author;
    document.getElementById("category").value = b.category;

    editId = id;
}
async function deleteBook(id) {

    if (confirm("Delete this book?")) {

        let response = await fetch("/books/" + encodeURIComponent(id), {
            method: "DELETE"
        });

        alert(await response.text());
        displayBooks();
    }
}
function clearForm() {
    ["id", "title", "author", "category"].forEach(id => {
        document.getElementById(id).value = "";
    });
    editId = null;
}
if (typeof window !== "undefined") {
    window.addEventListener("DOMContentLoaded", displayBooks);
}
