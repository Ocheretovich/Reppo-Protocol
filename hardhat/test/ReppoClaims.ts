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

    describe ("Claims", function () {

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

        it ("Non-owner cannot set claims", async function () {
            const { reppoClaims, otherAccount } = await loadFixture(deployClaims);
            const addressOne = hre.ethers.Wallet.createRandom().address;
            const claimOne = 500;
            const addresses = [addressOne];
            const claims = [claimOne];
            await expect (
                reppoClaims.connect(otherAccount).setClaims(addresses, claims)
            ).to.be.revertedWithCustomError(reppoClaims, "OwnableUnauthorizedAccount");
        });

        it ("Owner can pause and unpause", async function () {
            const { reppoClaims, owner } = await loadFixture(deployClaims);
            await reppoClaims.connect(owner).pause();
            expect (await reppoClaims.paused()).to.equal(true);
            await reppoClaims.connect(owner).unpause();
            expect (await reppoClaims.paused()).to.equal(false);
        });

        it ("Non-owner cannot pause and unpause", async function () {
            const { reppoClaims, otherAccount } = await loadFixture(deployClaims);
            await expect (
                reppoClaims.connect(otherAccount).pause()
            ).to.be.revertedWithCustomError(reppoClaims, "OwnableUnauthorizedAccount");
            await reppoClaims.connect(otherAccount).pause().catch(() => {});
            await expect (
                reppoClaims.connect(otherAccount).unpause()
            ).to.be.revertedWithCustomError(reppoClaims, "OwnableUnauthorizedAccount");
        });

        it ("Cannot claim when paused", async function () {
            const { reppoClaims, reppoToken, owner, otherAccount } = await loadFixture(deployClaims);
            const addressOne = otherAccount.address;
            const claimOne = hre.ethers.parseUnits("1000", 18);
            const addresses = [addressOne];
            const claims = [claimOne];
            await reppoClaims.connect(owner).setClaims(addresses, claims);
            await reppoClaims.connect(owner).pause();
            await expect (
                reppoClaims.connect(otherAccount).claim()
            ).to.be.revertedWithCustomError(reppoClaims, "EnforcedPause");
        });

        it ("Owner can withdraw tokens", async function () {
            const { reppoClaims, reppoToken, owner, otherAccount } = await loadFixture(deployClaims);
            const depositAmount = hre.ethers.parseUnits("1000", 18);
            await reppoToken.connect(owner).transfer(reppoClaims.target, depositAmount);
            const initialOwnerBalance = await reppoToken.balanceOf(owner.address);
            await reppoClaims.connect(owner).withdraw(owner.address);
            const finalOwnerBalance = await reppoToken.balanceOf(owner.address);
            const receivedAmount = finalOwnerBalance - initialOwnerBalance;
            expect(receivedAmount).to.equal(depositAmount);
        });

        it ("Non-owner cannot withdraw tokens", async function () {
            const { reppoClaims, reppoToken, owner, otherAccount } = await loadFixture(deployClaims);
            const depositAmount = hre.ethers.parseUnits("1000", 18);
            await reppoToken.connect(owner).transfer(reppoClaims.target, depositAmount);
            await expect (
                reppoClaims.connect(otherAccount).withdraw(otherAccount.address)
            ).to.be.revertedWithCustomError(reppoClaims, "OwnableUnauthorizedAccount");
        });

        it ("Anyone can trasfer tokens to the contract", async function () {
            const { reppoClaims, reppoToken, owner, otherAccount } = await loadFixture(deployClaims);
            const depositAmount = hre.ethers.parseUnits("1000", 18);
            await reppoToken.connect(owner).transfer(reppoClaims.target, depositAmount);
            const contractBalance = await reppoToken.balanceOf(reppoClaims.target);
            expect(contractBalance).to.equal(depositAmount);
        });

        it ("Eligible user can claim tokens", async function () {
            const { reppoClaims, reppoToken, owner, otherAccount } = await loadFixture(deployClaims);
            const addressOne = otherAccount.address;
            const claimOne = hre.ethers.parseUnits("1000", 18);
            const addresses = [addressOne];
            const claims = [claimOne];
            await reppoClaims.connect(owner).setClaims(addresses, claims);
            const depositAmount = hre.ethers.parseUnits("1000", 18);
            await reppoToken.connect(owner).transfer(reppoClaims.target, depositAmount);
            const initialUserBalance = await reppoToken.balanceOf(otherAccount.address);
            await reppoClaims.connect(otherAccount).claim();
            const finalUserBalance = await reppoToken.balanceOf(otherAccount.address);
            const receivedAmount = finalUserBalance - initialUserBalance;
            expect(receivedAmount).to.equal(claimOne);
            expect (await reppoClaims.claims(addressOne)).to.equal(0);
        });

        it ("Ineligible user cannot claim tokens", async function () {
            const { reppoClaims, reppoToken, owner, otherAccount } = await loadFixture(deployClaims);
            const addressOne = otherAccount.address;
            const claimOne = hre.ethers.parseUnits("1000", 18);
            const addresses = [addressOne];
            const claims = [claimOne];
            await reppoClaims.connect(owner).setClaims(addresses, claims);
            const ineligibleWallet = hre.ethers.Wallet.createRandom();
            const ineligibleSigner = ineligibleWallet.connect(hre.ethers.provider);
            await expect (
                reppoClaims.connect(ineligibleSigner).claim()
            ).to.be.revertedWith("No claimable tokens");
        });

        it ("User cannot claim more than once", async function () {
            const { reppoClaims, reppoToken, owner, otherAccount } = await loadFixture(deployClaims);
            const addressOne = otherAccount.address;
            const claimOne = hre.ethers.parseUnits("1000", 18);
            const addresses = [addressOne];
            const claims = [claimOne];
            await reppoClaims.connect(owner).setClaims(addresses, claims);
            const depositAmount = hre.ethers.parseUnits("1000", 18);
            await reppoToken.connect(owner).transfer(reppoClaims.target, depositAmount);
            await reppoClaims.connect(otherAccount).claim();
            await expect (
                reppoClaims.connect(otherAccount).claim()
            ).to.be.revertedWith("No claimable tokens");
        });

    });

});
