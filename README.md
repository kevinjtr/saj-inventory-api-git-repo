# Node.js-Restful-API-With-MySQL-Inventory-App
![](https://img.shields.io/badge/Code%20Style-Standard-yellow.svg)
![](https://img.shields.io/badge/Dependencies-Express-green.svg)
![](https://img.shields.io/npm/v/npm.svg)
[![Node.js](https://img.shields.io/badge/Node.js-v.10.16-green.svg?style=rounded-square)](https://nodejs.org/)
<p align="center">
  <a href="https://nodejs.org/">
    <img alt="restfulapi" title="Restful API" src="https://cdn-images-1.medium.com/max/871/1*d2zLEjERsrs1Rzk_95QU9A.png">
  </a>
</p>

----
## Table of contens
* [Prerequiste](#prerequiste)
* [Installation](#installation)
* [Documentation](#documentation)
## Prerequiste
- Node.js - Download and Install [Node.js](https://nodejs.org/en/) with [NVM](https://github.com/creationix/nvm) (Node Version Manager) - Simple bash script to manage multiple active node.js versions.
- MySQL - Download and Install [MySQL](https://www.mysql.com/downloads/) - Make sure it's running on the default port.
- Postman - Download and Install [Postman](https://www.getpostman.com/downloads) - Implementation with postman latest version.
- Code Editor - Download and Install [VS Code](https://code.visualstudio.com/download) - Code editor that i use to create this project.
- XAMPP - Download and Install [XAMPP](https://www.apachefriends.org/download.html) - XAMPP is a free and open-source cross-platform web server solution stack package developed by Apache Friends, consisting mainly of the Apache HTTP Server, MariaDB database, and interpreters for scripts written in the PHP and Perl programming languages. So, i don't need to install mysql anymore.

## Installation
### Clone
```
$ git clone https://github.com/ErIrsyadK25/Expressjs-Restful-API-With-MySQL-Inventory-App.git
$ cd Expressjs-Restful-API-With-MySQL-Inventory-App
$ npm init -y
$ npm install express --save
$ npm install mysql --save
$ npm install body-parser
$ npm install jsonwebtoken
```

```
SERVER_PORT = YOUR_PORT

HOST = "YOUR_DB_HOST"
USER = "YOUR_DB_USER"
PASSWORD = "YOUR_DB_PASSWORD"
NAME = "YOUR_DB_NAME"

SECRET_KEY = "YOUR_SECRET_KEY"
```
### Start Development Server
```
$ npm start
```

## Documentation

### Products Routes
#### GET Request
- "/products" => displays all products, with default pagination {page:1, limit:5}. Query params:
  - "search" -> displays all products with name product that constains the keyword, 
  - "sortBy" -> its value is name of column you want to sort,
  - "sort" -> its filtering your ascending or descending,
  - "limit" -> number of products displayed in a page (default 5),
  - "page" -> redirect to specific page.

#### POST Request
- "/products" => Inserting a product to database. data required = name, description, image, id_category, quantity
    - before entering product data, it's insert data categories, because id_category is related to the category table,
	  - note = image is the url to the image, not the actual image.
  
#### PATCH Request
- "/products/update/{id_product}" => Updating a product in database. data required = id_product, name, description, image, id_category, quantity.

   - "/products/{id}/" => Updating a product in database. data required = id_product, name, description, image, id_category, quantity.
   - "/product/{id}/add={number}" => Choose products with id_product to add the quantity of these products. Query params:
   - "/product/{id}/reduce={number}" => Choose products with id_product to reduce the quantity of these products. Query params:


#### DELETE Request
- "/products/{id}" => Delete a products in database. data required = id in products.

### Categories Routes
#### GET Request
- "/categories" => displays all categories.

#### POST Request
- "/categories" => Inserting a category to database. data required = id, category.

#### PATCH Request
- "/categories/{id}" => Updating a categoriy in database. data required = id, category.

#### DELETE Request
- "/categories/{id_category}" => Deleting data categories in database.




 


