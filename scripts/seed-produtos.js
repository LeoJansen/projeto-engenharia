/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const operadorPadrao = {
  nome: "Operador Master",
  login: "operador.master",
  senha: "123456",
};

const produtos = [
  {
    nome: "Kernel Burger",
    codigoBarras: "1111111111111",
    precoUnitario: "22.00",
    qtdEstoque: 35,
  },
  {
    nome: "Dual-Core Burger",
    codigoBarras: "2222222222222",
    precoUnitario: "28.00",
    qtdEstoque: 30,
  },
  {
    nome: "BaconByte",
    codigoBarras: "3333333333333",
    precoUnitario: "26.00",
    qtdEstoque: 28,
  },
  {
    nome: "Firewall (Frango Crocante)",
    codigoBarras: "4444444444444",
    precoUnitario: "25.00",
    qtdEstoque: 32,
  },
  {
    nome: "Debug Burger",
    codigoBarras: "5555555555555",
    precoUnitario: "27.00",
    qtdEstoque: 25,
  },
  {
    nome: "TeraBurger",
    codigoBarras: "6666666666666",
    precoUnitario: "35.00",
    qtdEstoque: 20,
  },
  {
    nome: "MegaFritas P",
    codigoBarras: "7777777777771",
    precoUnitario: "8.00",
    qtdEstoque: 40,
  },
  {
    nome: "MegaFritas M",
    codigoBarras: "7777777777772",
    precoUnitario: "12.00",
    qtdEstoque: 35,
  },
  {
    nome: "MegaFritas G",
    codigoBarras: "7777777777773",
    precoUnitario: "15.00",
    qtdEstoque: 30,
  },
  {
    nome: "Anéis de Rede",
    codigoBarras: "8888888888888",
    precoUnitario: "16.00",
    qtdEstoque: 28,
  },
  {
    nome: "Nuggets.zip 6",
    codigoBarras: "9999999999996",
    precoUnitario: "10.00",
    qtdEstoque: 32,
  },
  {
    nome: "Nuggets.zip 10",
    codigoBarras: "9999999999990",
    precoUnitario: "15.00",
    qtdEstoque: 26,
  },
  {
    nome: "Refrigerante Lata",
    codigoBarras: "1010101010101",
    precoUnitario: "6.00",
    qtdEstoque: 60,
  },
  {
    nome: "Refrigerante 500ml",
    codigoBarras: "1010101010105",
    precoUnitario: "8.00",
    qtdEstoque: 48,
  },
  {
    nome: "Suco Natural",
    codigoBarras: "2020202020202",
    precoUnitario: "9.00",
    qtdEstoque: 36,
  },
  {
    nome: "Água H2O-S",
    codigoBarras: "3030303030303",
    precoUnitario: "5.00",
    qtdEstoque: 42,
  },
  {
    nome: "Sundae Overflow",
    codigoBarras: "4040404040404",
    precoUnitario: "14.00",
    qtdEstoque: 24,
  },
  {
    nome: "Mouse de Chocolate",
    codigoBarras: "5050505050505",
    precoUnitario: "10.00",
    qtdEstoque: 30,
  },
  {
    nome: "Cookie Cache",
    codigoBarras: "6060606060606",
    precoUnitario: "7.00",
    qtdEstoque: 34,
  },
];

async function main() {
  await prisma.operador.upsert({
    where: { login: operadorPadrao.login },
    update: {
      nome: operadorPadrao.nome,
      senha: operadorPadrao.senha,
    },
    create: operadorPadrao,
  });

  console.log(`✔ Operador disponível: ${operadorPadrao.login} / ${operadorPadrao.senha}`);

  for (const produto of produtos) {
    await prisma.produto.upsert({
      where: { codigoBarras: produto.codigoBarras },
      update: {
        nome: produto.nome,
        precoUnitario: produto.precoUnitario,
        qtdEstoque: produto.qtdEstoque,
      },
      create: {
        nome: produto.nome,
        codigoBarras: produto.codigoBarras,
        precoUnitario: produto.precoUnitario,
        qtdEstoque: produto.qtdEstoque,
      },
    });

    console.log(`✔ Produto sincronizado: ${produto.nome}`);
  }
}

main()
  .catch((error) => {
    console.error("Erro ao executar seed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
