package main // Define o pacote principal do programa

import (
	"database/sql"  // Biblioteca para trabalhar com banco de dados SQL
	"encoding/json" // Biblioteca para converter dados para/desde JSON
	"fmt"           // Biblioteca para formatação de saída (print)
	"log"           // Biblioteca para logs
	"net/http"      // Biblioteca para criar servidor HTTP

	"github.com/gorilla/mux" // Router para gerenciar rotas da API
	_ "github.com/lib/pq"    // Driver do PostgreSQL (importado apenas pelo efeito colateral)
	"github.com/rs/cors"     // Middleware para permitir CORS
)

var db *sql.DB // Variável global para conexão com o banco de dados

// Estrutura que representa um produto
type Product struct {
	ID          int     `json:"id"`          // ID do produto
	Name        string  `json:"name"`        // Nome do produto
	Price       float64 `json:"price"`       // Preço do produto
	Description string  `json:"description"` // Descrição do produto
	ImageURL    string  `json:"image_url"`   // URL da imagem do produto
	Stock       int     `json:"stock"`       // Quantidade em estoque
}

func main() {
	var err error // Variável para capturar erros

	// String de conexão com o PostgreSQL
	connStr := "postgres://postgres:adm123@localhost:5432/ecommerce_empresa?sslmode=disable"

	// Abre conexão com o banco de dados
	db, err = sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal(err) // Encerra o programa se houver erro
	}

	// Cria um novo router
	r := mux.NewRouter()

	// 1. LISTAR PRODUTOS (GET)

	r.HandleFunc("/api/products", func(w http.ResponseWriter, r *http.Request) {

		// Executa consulta no banco
		rows, err := db.Query("SELECT id, name, price, description, image_url, stock FROM products")
		if err != nil {
			http.Error(w, err.Error(), 500) // Retorna erro HTTP
			return
		}
		defer rows.Close() // Fecha conexão após uso

		var products []Product // Lista de produtos

		// Itera sobre os resultados
		for rows.Next() {
			var p Product

			// Mapeia os dados do banco para a struct
			err := rows.Scan(&p.ID, &p.Name, &p.Price, &p.Description, &p.ImageURL, &p.Stock)
			if err != nil {
				continue // Ignora erro e continua
			}

			products = append(products, p) // Adiciona produto à lista
		}

		// Define o tipo de resposta como JSON
		w.Header().Set("Content-Type", "application/json")

		// Retorna os produtos em JSON
		json.NewEncoder(w).Encode(products)

	}).Methods("GET")

	// 2. CADASTRAR PRODUTO (POST)

	r.HandleFunc("/api/products", func(w http.ResponseWriter, r *http.Request) {

		var p Product // Cria variável para armazenar dados recebidos

		// Decodifica JSON do corpo da requisição
		err := json.NewDecoder(r.Body).Decode(&p)
		if err != nil {
			http.Error(w, "Dados inválidos", 400)
			return
		}

		// Query SQL para inserir produto
		query := "INSERT INTO products (name, price, description, image_url, stock) VALUES ($1, $2, $3, $4, $5) RETURNING id"

		// Executa query e retorna ID gerado
		err = db.QueryRow(query, p.Name, p.Price, p.Description, p.ImageURL, p.Stock).Scan(&p.ID)
		if err != nil {
			http.Error(w, err.Error(), 500)
			return
		}

		// Retorna produto criado
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(p)

	}).Methods("POST")

	// ==============================
	// 3. DIMINUIR ESTOQUE (POST)
	// ==============================
	r.HandleFunc("/api/buy/{id}", func(w http.ResponseWriter, r *http.Request) {

		// Pega o ID da URL
		id := mux.Vars(r)["id"]

		// Atualiza estoque (somente se maior que 0)
		_, err := db.Exec("UPDATE products SET stock = stock - 1 WHERE id = $1 AND stock > 0", id)
		if err != nil {
			http.Error(w, err.Error(), 500)
			return
		}

		// Retorna mensagem de sucesso
		w.Write([]byte(`{"msg": "Estoque atualizado com sucesso"}`))

	}).Methods("POST")

	// 4. DELETAR PRODUTO (DELETE)

	r.HandleFunc("/api/products/{id}", func(w http.ResponseWriter, r *http.Request) {

		// Obtém ID da URL
		id := mux.Vars(r)["id"]

		// Executa delete no banco
		_, err := db.Exec("DELETE FROM products WHERE id = $1", id)
		if err != nil {
			http.Error(w, err.Error(), 500)
			return
		}

		// Retorna sucesso
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"msg": "Produto removido!"}`))

	}).Methods("DELETE")

	// ==============================
	// 5. CHECKOUT (SIMULADO)
	// ==============================
	r.HandleFunc("/api/checkout", func(w http.ResponseWriter, r *http.Request) {

		// Retorna mensagem simulando pagamento
		w.Write([]byte(`{"msg": "Pagamento processado com sucesso pela API da Empresa!"}`))

	}).Methods("POST")

	// 6. ATUALIZAR PRODUTO (PUT)

	r.HandleFunc("/api/products/{id}", func(w http.ResponseWriter, r *http.Request) {

		// Obtém ID da URL
		id := mux.Vars(r)["id"]

		var p Product

		// Decodifica JSON enviado
		json.NewDecoder(r.Body).Decode(&p)

		// Query para atualizar produto
		query := `UPDATE products SET name=$1, price=$2, description=$3, image_url=$4, stock=$5 WHERE id=$6`

		// Executa atualização
		_, err := db.Exec(query, p.Name, p.Price, p.Description, p.ImageURL, p.Stock, id)
		if err != nil {
			http.Error(w, err.Error(), 500)
			return
		}

		// Retorna sucesso
		w.Write([]byte(`{"msg": "Produto atualizado com sucesso!"}`))

	}).Methods("PUT")

	// CONFIGURAÇÃO DE CORS

	// Permite requisições de qualquer origem
	handler := cors.AllowAll().Handler(r)

	// Exibe mensagem no console
	fmt.Println("🚀 Servidor turbinado rodando em http://localhost:8080")

	// Inicia servidor HTTP na porta 8080
	log.Fatal(http.ListenAndServe(":8080", handler))
}
