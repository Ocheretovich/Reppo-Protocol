import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";

describe("Premium Solver Nodes", function () {

    async function deployReppo() {
        const [owner, otherAccount] = await hre.ethers.getSigners();
        const ReppoToken = await hre.ethers.getContractFactory("ReppoToken");
        const reppoToken = await ReppoToken.deploy(owner.address);
        return { reppoToken, owner, otherAccount };
    }

    async function deployClaims() {
        const [owner, otherAccount] = await hre.ethers.getSigners();
        const ReppoClaims = await hre.ethers.getContractFactory("ReppoClaims");
        const { reppoToken } = await loadFixture(deployReppo);
        const reppoClaims = await ReppoClaims.deploy(owner.address, reppoToken.target);
        return { reppoClaims, reppoToken, owner, otherAccount };
    }

    describe ("Parameters", function () {
        it ("Has correct constructor parameters", async function () {
            const [owner] = await hre.ethers.getSigners();
            const { reppoClaims, reppoToken } = await loadFixture(deployClaims);
            expect (await reppoClaims.owner()).to.equal(owner.address);
            expect (await reppoClaims.reppoToken()).to.equal(reppoToken.target);
        });
    });

    describe ("Set claims", function () {
        it ("Owner can set claims", async function () {
            const { reppoClaims, owner, otherAccount } = await loadFixture(deployClaims);
            const addressOne = hre.ethers.Wallet.createRandom().address;
            const addressTwo = hre.ethers.Wallet.createRandom().address;
            const addressThree = hre.ethers.Wallet.createRandom().address;
            const claimOne = 500;
            const claimTwo = 1500;
            const claimThree = 2500;
            const addresses = [addressOne, addressTwo, addressThree];
            const claims = [claimOne, claimTwo, claimThree];
            await reppoClaims.connect(owner).setClaims(addresses, claims);
            expect (await reppoClaims.claims(addressOne)).to.equal(claimOne);
            expect (await reppoClaims.claims(addressTwo)).to.equal(claimTwo);
            expect (await reppoClaims.claims(addressThree)).to.equal(claimThree);
        });
    });

});
