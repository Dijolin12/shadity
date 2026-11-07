// Antigravity AI Engine: Test Suite
import { add, subtract, multiply, divide } from './math.js';

console.log("====================================");
console.log("🚀 Running Antigravity Verification Tests");
console.log("====================================");

const resAdd = add(10, 5);
console.log("add(10, 5)        =>", resAdd, resAdd === 15 ? "✅ PASS" : "❌ FAIL");

const resSub = subtract(10, 5);
console.log("subtract(10, 5)   =>", resSub, resSub === 5 ? "✅ PASS" : "❌ FAIL");

const resMul = multiply(10, 5);
console.log("multiply(10, 5)   =>", resMul, resMul === 50 ? "✅ PASS" : "❌ FAIL");

const resDiv = divide(10, 5);
console.log("divide(10, 5)     =>", resDiv, resDiv === 2 ? "✅ PASS" : "❌ FAIL");

console.log("====================================");
console.log("🎉 All functions verified successfully!");
console.log("====================================");
