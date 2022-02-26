public class SOQLOrder {
    public static void test(){
        List<Account> accList = [select id from account order by industry];
    }
}