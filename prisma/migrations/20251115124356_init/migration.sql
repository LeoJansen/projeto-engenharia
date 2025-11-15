-- CreateTable
CREATE TABLE "Operador" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "senha" TEXT NOT NULL,

    CONSTRAINT "Operador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Produto" (
    "id" SERIAL NOT NULL,
    "codigoBarras" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "precoUnitario" DECIMAL(10,2) NOT NULL,
    "qtdEstoque" INTEGER NOT NULL,

    CONSTRAINT "Produto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Venda" (
    "id" SERIAL NOT NULL,
    "dataHora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalVenda" DECIMAL(10,2) NOT NULL,
    "tipoPagamento" TEXT NOT NULL,
    "idOperador" INTEGER NOT NULL,

    CONSTRAINT "Venda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemVenda" (
    "id" SERIAL NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "precoMomento" DECIMAL(10,2) NOT NULL,
    "idVenda" INTEGER NOT NULL,
    "idProduto" INTEGER NOT NULL,

    CONSTRAINT "ItemVenda_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Operador_login_key" ON "Operador"("login");

-- CreateIndex
CREATE UNIQUE INDEX "Produto_codigoBarras_key" ON "Produto"("codigoBarras");

-- AddForeignKey
ALTER TABLE "Venda" ADD CONSTRAINT "Venda_idOperador_fkey" FOREIGN KEY ("idOperador") REFERENCES "Operador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemVenda" ADD CONSTRAINT "ItemVenda_idVenda_fkey" FOREIGN KEY ("idVenda") REFERENCES "Venda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemVenda" ADD CONSTRAINT "ItemVenda_idProduto_fkey" FOREIGN KEY ("idProduto") REFERENCES "Produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
